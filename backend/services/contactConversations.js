const ContactMessage = require("../models/ContactMessage");
const ContactConversation = require("../models/ContactConversation");
const ContactConversationMessage = require("../models/ContactConversationMessage");
const { notifyAdmins, notifyUser, sendEmail } = require("../utils/notifications");
const { isStaffRole, normalizeUserRole } = require("../utils/roles");

const STATUS_MAP = {
  nou: "noua",
  noua: "noua",
  in_proces: "in_progres",
  in_progres: "in_progres",
  rezolvat: "finalizata",
  finalizata: "finalizata",
};

function normalizeConversationStatus(value) {
  return STATUS_MAP[String(value || "").trim().toLowerCase()] || "noua";
}

function getUserId(user) {
  return String(user?._id || user?.id || "").trim();
}

function getUserName(user) {
  return (
    [user?.nume, user?.prenume].filter(Boolean).join(" ").trim() ||
    String(user?.email || "").trim() ||
    "Utilizator"
  );
}

function getAuthorRole(user, fallbackRole = "anonim") {
  if (!user) return fallbackRole;
  return normalizeUserRole(user.rol || user.role || fallbackRole);
}

function buildPreview(text) {
  return String(text || "").trim().replace(/\s+/g, " ").slice(0, 280);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function userMatchesConversationByEmail(user, conversation) {
  const userEmail = normalizeEmail(user?.email);
  const conversationEmail = normalizeEmail(conversation?.clientEmail);
  return Boolean(userEmail && conversationEmail && userEmail === conversationEmail);
}

async function linkConversationToAuthenticatedClient(conversation, user) {
  if (!conversation || !user) return conversation;
  if (conversation.clientId || !userMatchesConversationByEmail(user, conversation)) {
    return conversation;
  }

  const clientId = user?._id || user?.id || null;
  if (!clientId) return conversation;

  await ContactConversation.updateOne(
    { _id: conversation._id },
    { $set: { clientId } }
  );

  return {
    ...conversation,
    clientId,
  };
}

function canAccessConversation(user, conversation) {
  if (!user || !conversation) return false;
  const role = normalizeUserRole(user.rol || user.role);
  if (isStaffRole(role)) return true;

  const authUserId = getUserId(user);
  if (authUserId && String(conversation.clientId || "") === authUserId) {
    return true;
  }

  return userMatchesConversationByEmail(user, conversation);
}

function computeNextStatus(currentStatus, authorRole) {
  const normalizedCurrent = normalizeConversationStatus(currentStatus);
  const normalizedAuthorRole = normalizeUserRole(authorRole);

  if (normalizedAuthorRole === "admin" || normalizedAuthorRole === "patiser") {
    return normalizedCurrent === "noua" ? "in_progres" : normalizedCurrent;
  }

  if (normalizedCurrent === "finalizata") {
    return "in_progres";
  }

  return normalizedCurrent;
}

async function backfillLegacyContactMessages({ limit = 250 } = {}) {
  const legacyMessages = await ContactMessage.find({ conversationId: null })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();

  for (const legacy of legacyMessages) {
    const existingConversation = await ContactConversation.findOne({
      legacyContactMessageId: legacy._id,
    }).lean();

    if (existingConversation) {
      await ContactMessage.updateOne(
        { _id: legacy._id },
        {
          $set: {
            conversationId: existingConversation._id,
            migratedAt: new Date(),
          },
        }
      );
      continue;
    }

    const conversation = await ContactConversation.create({
      clientId: legacy.userId || null,
      clientName: legacy.nume || legacy.email || "Client",
      clientEmail: legacy.email || "",
      clientPhone: legacy.telefon || "",
      subject: legacy.subiect || "",
      status: normalizeConversationStatus(legacy.status),
      source: legacy.sursa || "legacy_contact_message",
      lastMessageAt: legacy.createdAt || new Date(),
      lastMessagePreview: buildPreview(legacy.mesaj),
      lastSenderRole: legacy.userId ? "client" : "anonim",
      messageCount: 1,
      legacyContactMessageId: legacy._id,
      assignedTo: legacy.gestionatDe || null,
      assignedAt: legacy.gestionatLa || null,
      closedAt:
        normalizeConversationStatus(legacy.status) === "finalizata"
          ? legacy.gestionatLa || legacy.updatedAt || legacy.createdAt || new Date()
          : null,
    });

    const message = await ContactConversationMessage.create({
      conversationId: conversation._id,
      authorId: legacy.userId || null,
      authorRole: legacy.userId ? "client" : "anonim",
      authorName: legacy.nume || legacy.email || "Client",
      authorEmail: legacy.email || "",
      text: legacy.mesaj || "",
      source: "legacy_contact_message",
      isLegacySeed: true,
    });

    const legacyCreatedAt = legacy.createdAt || new Date();
    const legacyUpdatedAt = legacy.updatedAt || legacyCreatedAt;

    await ContactConversation.updateOne(
      { _id: conversation._id },
      {
        $set: {
          createdAt: legacyCreatedAt,
          updatedAt: legacyUpdatedAt,
          lastMessageAt: legacyCreatedAt,
        },
      }
    );

    await ContactConversationMessage.updateOne(
      { _id: message._id },
      {
        $set: {
          createdAt: legacyCreatedAt,
          updatedAt: legacyCreatedAt,
        },
      }
    );

    await ContactMessage.updateOne(
      { _id: legacy._id },
      {
        $set: {
          conversationId: conversation._id,
          migratedAt: new Date(),
        },
      }
    );
  }
}

function buildListQueryForUser(user, options = {}) {
  const status = options.status ? normalizeConversationStatus(options.status) : "";
  const search = String(options.search || "").trim();
  const role = normalizeUserRole(user?.rol || user?.role);
  const query = {};

  if (status) {
    query.status = status;
  }

  if (isStaffRole(role)) {
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { clientName: regex },
        { clientEmail: regex },
        { subject: regex },
        { lastMessagePreview: regex },
      ];
    }
    return query;
  }

  const access = [];
  const authUserId = getUserId(user);
  const authUserEmail = normalizeEmail(user?.email);

  if (authUserId) {
    access.push({ clientId: authUserId });
  }
  if (authUserEmail) {
    access.push({ clientEmail: authUserEmail });
  }

  query.$or = access.length > 0 ? access : [{ _id: null }];
  return query;
}

async function listConversationsForUser(user, options = {}) {
  await backfillLegacyContactMessages();

  const limit = Math.max(1, Math.min(Number(options.limit || 100), 200));
  const query = buildListQueryForUser(user, options);
  const list = await ContactConversation.find(query)
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .limit(limit)
    .lean();

  if (!isStaffRole(user?.rol || user?.role)) {
    return Promise.all(
      list.map(async (item) => {
        const linked = await linkConversationToAuthenticatedClient(item, user);
        return linked;
      })
    );
  }

  return list;
}

async function getConversationForUser(conversationId, user) {
  await backfillLegacyContactMessages();

  const conversation = await ContactConversation.findById(conversationId).lean();
  if (!conversation) {
    return null;
  }

  const linkedConversation = await linkConversationToAuthenticatedClient(conversation, user);

  if (!canAccessConversation(user, linkedConversation)) {
    const error = new Error("Acces interzis la aceasta conversatie.");
    error.status = 403;
    throw error;
  }

  return linkedConversation;
}

async function getConversationMessages(conversationId) {
  return ContactConversationMessage.find({ conversationId })
    .sort({ createdAt: 1, _id: 1 })
    .lean();
}

async function notifyConversationOpened(conversation) {
  await notifyAdmins({
    titlu: "Solicitare noua din contact",
    mesaj: `${conversation.clientName} a deschis o conversatie noua din formularul de contact.`,
    tip: "info",
    link: "/admin/contact",
    meta: {
      conversationId: String(conversation._id),
    },
  });
}

async function notifyConversationReply(conversation, message) {
  const authorRole = normalizeUserRole(message.authorRole);
  const conversationId = String(conversation._id);
  const subject = conversation.subject || "solicitarea ta";

  if (authorRole === "admin" || authorRole === "patiser") {
    if (conversation.clientId) {
      await notifyUser(conversation.clientId, {
        titlu: "Raspuns nou de la Maison-Douce",
        mesaj: `${message.authorName} a raspuns in conversatia despre ${subject}.`,
        tip: "contact",
        link: "/contact",
        actorId: message.authorId,
        actorRole: authorRole,
        meta: { conversationId },
      });
      return;
    }

    if (conversation.clientEmail) {
      await sendEmail(
        conversation.clientEmail,
        "Raspuns nou de la Maison-Douce",
        `
          <div style="font-family: Arial, sans-serif; color: #1f2937;">
            <h2>Ai primit un raspuns nou</h2>
            <p>${message.authorName} a raspuns in conversatia despre ${subject}.</p>
            <p>Autentifica-te in contul tau si deschide pagina Contact pentru a continua discutia.</p>
            <p style="font-size: 12px; color: #6b7280;">Maison-Douce</p>
          </div>
        `
      );
    }
    return;
  }

  await notifyAdmins({
    titlu: "Clientul a raspuns in contact",
    mesaj: `${conversation.clientName} a trimis un mesaj nou in conversatia de contact.`,
    tip: "contact",
    link: "/admin/contact",
    actorId: message.authorId,
    actorRole: authorRole,
    meta: { conversationId },
  });
}

async function createConversation({ user, nume, email, telefon, subiect, mesaj, source }) {
  const normalizedRole = getAuthorRole(user, "anonim");
  const clientId =
    normalizedRole === "client" && (user?._id || user?.id) ? user._id || user.id : null;
  const clientName = nume || getUserName(user) || email || "Client";
  const clientEmail = email || normalizeEmail(user?.email);

  const conversation = await ContactConversation.create({
    clientId,
    clientName,
    clientEmail,
    clientPhone: telefon || String(user?.telefon || "").trim(),
    subject: subiect || "",
    status: "noua",
    source: source || "formular_contact",
    lastMessageAt: new Date(),
    lastMessagePreview: buildPreview(mesaj),
    lastSenderRole: normalizedRole,
    messageCount: 1,
  });

  const createdMessage = await ContactConversationMessage.create({
    conversationId: conversation._id,
    authorId: clientId || null,
    authorRole: normalizedRole,
    authorName: clientName,
    authorEmail: clientEmail,
    text: mesaj,
    source: "contact_form",
  });

  await notifyConversationOpened(conversation);

  return {
    conversation: conversation.toObject(),
    message: createdMessage.toObject(),
  };
}

async function appendConversationMessage({ conversationId, user, text }) {
  const conversation = await getConversationForUser(conversationId, user);
  if (!conversation) {
    const error = new Error("Conversatia nu exista.");
    error.status = 404;
    throw error;
  }

  const authorRole = getAuthorRole(user, "client");
  const authorId = user?._id || user?.id || null;
  const authorName = getUserName(user);
  const authorEmail = normalizeEmail(user?.email);
  const nextStatus = computeNextStatus(conversation.status, authorRole);

  const message = await ContactConversationMessage.create({
    conversationId: conversation._id,
    authorId,
    authorRole,
    authorName,
    authorEmail,
    text,
    source: "contact_chat",
  });

  const updatedConversation = await ContactConversation.findByIdAndUpdate(
    conversation._id,
    {
      $set: {
        status: nextStatus,
        lastMessageAt: message.createdAt,
        lastMessagePreview: buildPreview(text),
        lastSenderRole: authorRole,
        closedAt: nextStatus === "finalizata" ? new Date() : null,
        ...(isStaffRole(authorRole)
          ? {
              assignedTo: authorId || conversation.assignedTo || null,
              assignedAt: conversation.assignedAt || new Date(),
            }
          : {}),
      },
      $inc: { messageCount: 1 },
    },
    { new: true, runValidators: true }
  ).lean();

  await notifyConversationReply(updatedConversation, {
    ...message.toObject(),
    authorRole,
    authorId,
    authorName,
  });

  return {
    conversation: updatedConversation,
    message: message.toObject(),
  };
}

async function updateConversationStatus({ conversationId, user, status }) {
  const conversation = await getConversationForUser(conversationId, user);
  if (!conversation) {
    const error = new Error("Conversatia nu exista.");
    error.status = 404;
    throw error;
  }

  const normalizedStatus = normalizeConversationStatus(status);
  const updated = await ContactConversation.findByIdAndUpdate(
    conversation._id,
    {
      $set: {
        status: normalizedStatus,
        assignedTo: user?._id || user?.id || conversation.assignedTo || null,
        assignedAt: conversation.assignedAt || new Date(),
        closedAt: normalizedStatus === "finalizata" ? new Date() : null,
      },
    },
    { new: true, runValidators: true }
  ).lean();

  return updated;
}

module.exports = {
  appendConversationMessage,
  backfillLegacyContactMessages,
  createConversation,
  getConversationForUser,
  getConversationMessages,
  listConversationsForUser,
  normalizeConversationStatus,
  updateConversationStatus,
};
