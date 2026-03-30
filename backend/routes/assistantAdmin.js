const express = require("express");
const { authRequired, roleCheck } = require("../middleware/auth");
const {
  adminMutationLimiter,
  adminReadLimiter,
} = require("../middleware/rateLimiters");
const { withValidation } = require("../middleware/validate");
const { recordAuditLog } = require("../utils/audit");
const { createLogger, serializeError } = require("../utils/log");
const {
  fail,
  readArray,
  readBoolean,
  readEnum,
  readMongoId,
  readNumber,
  readString,
  readUrl,
} = require("../utils/validation");
const AssistantKnowledgeEntry = require("../models/AssistantKnowledgeEntry");
const AssistantQuestionGap = require("../models/AssistantQuestionGap");
const {
  buildEntryResponse,
  buildQuestionGapResponse,
  listAdminKnowledgeEntries,
  listAssistantQuestionGaps,
} = require("../services/assistantKnowledge");

const router = express.Router();
const logger = createLogger("assistant_admin_route");

function hasField(body, field) {
  return Boolean(body) && Object.prototype.hasOwnProperty.call(body, field);
}

function readAssistantAction(value, index) {
  const fieldPrefix = `actions[${index}]`;
  const type = readEnum(value?.type || "route", ["route", "href"], {
    field: `${fieldPrefix}.type`,
    defaultValue: "route",
  });
  const label = readString(value?.label, {
    field: `${fieldPrefix}.label`,
    required: true,
    min: 1,
    max: 120,
  });

  if (type === "route") {
    const to = readString(value?.to, {
      field: `${fieldPrefix}.to`,
      required: true,
      min: 1,
      max: 255,
    });
    if (!to.startsWith("/")) {
      fail(`${fieldPrefix}.to must start with /`, `${fieldPrefix}.to`);
    }
    return { type, label, to, href: "" };
  }

  const rawHref = String(value?.href || "").trim();
  if (!rawHref) {
    fail(`${fieldPrefix}.href is required`, `${fieldPrefix}.href`);
  }

  let href = "";
  if (/^(mailto:|tel:)/i.test(rawHref)) {
    href = rawHref;
  } else {
    href = readUrl(rawHref, {
      field: `${fieldPrefix}.href`,
      required: true,
    });
  }

  return { type, label, to: "", href };
}

function extractPayload(source, { partial = false } = {}) {
  const payload = {};

  if (!partial || hasField(source, "title")) {
    payload.title = readString(source?.title, {
      field: "title",
      required: !partial,
      min: 2,
      max: 160,
      defaultValue: "",
    });
  }

  if (!partial || hasField(source, "answer")) {
    payload.answer = readString(source?.answer, {
      field: "answer",
      required: !partial,
      min: 4,
      max: 4000,
      defaultValue: "",
    });
  }

  if (!partial || hasField(source, "keywords")) {
    payload.keywords = readArray(source?.keywords, {
      field: "keywords",
      defaultValue: [],
      maxItems: 20,
      parser: (item, index) =>
        readString(item, {
          field: `keywords[${index}]`,
          min: 1,
          max: 80,
        }),
    });
  }

  if (!partial || hasField(source, "actions")) {
    payload.actions = readArray(source?.actions, {
      field: "actions",
      defaultValue: [],
      maxItems: 6,
      parser: readAssistantAction,
    });
  }

  if (!partial || hasField(source, "priority")) {
    payload.priority = readNumber(source?.priority, {
      field: "priority",
      integer: true,
      min: 0,
      max: 1000,
      defaultValue: 100,
    });
  }

  if (!partial || hasField(source, "active")) {
    payload.active = readBoolean(source?.active, {
      field: "active",
      defaultValue: true,
    });
  }

  return payload;
}

function extractQuestionGapPatchPayload(source) {
  const payload = {};

  if (hasField(source, "status")) {
    payload.status = readEnum(source?.status, [
      "noua",
      "in_revizie",
      "rezolvata",
      "ignorata",
    ], {
      field: "status",
      required: true,
    });
  }

  if (hasField(source, "notes")) {
    payload.notes = readString(source?.notes, {
      field: "notes",
      max: 2000,
      defaultValue: "",
    });
  }

  if (hasField(source, "linkedKnowledgeEntryId")) {
    payload.linkedKnowledgeEntryId = readMongoId(source?.linkedKnowledgeEntryId, {
      field: "linkedKnowledgeEntryId",
      defaultValue: "",
    });
  }

  return payload;
}

router.get(
  "/admin",
  authRequired,
  roleCheck("admin", "patiser"),
  adminReadLimiter,
  async (_req, res) => {
    try {
      const items = await listAdminKnowledgeEntries();
      res.json({ items });
    } catch (error) {
      logger.error("assistant_admin_list_failed", {
        error: serializeError(error),
      });
      res
        .status(500)
        .json({ message: "Nu am putut incarca knowledge base-ul asistentului." });
    }
  }
);

router.get(
  "/admin/questions",
  authRequired,
  roleCheck("admin", "patiser"),
  adminReadLimiter,
  withValidation((req) => ({
    status: readEnum(req.query?.status, ["", "noua", "in_revizie", "rezolvata", "ignorata"], {
      field: "status",
      defaultValue: "",
    }),
    search: readString(req.query?.search, {
      field: "search",
      max: 160,
      defaultValue: "",
    }),
    limit: readNumber(req.query?.limit, {
      field: "limit",
      min: 1,
      max: 200,
      integer: true,
      defaultValue: 50,
    }),
  }), async (req, res) => {
    try {
      const items = await listAssistantQuestionGaps(req.validated);
      res.json({ items });
    } catch (error) {
      logger.error("assistant_question_gap_list_failed", {
        requestId: req.id,
        error: serializeError(error),
      });
      res.status(500).json({
        message: "Nu am putut incarca intrebarile care necesita review.",
      });
    }
  })
);

router.post(
  "/admin",
  authRequired,
  roleCheck("admin", "patiser"),
  adminMutationLimiter,
  withValidation((req) => extractPayload(req.body, { partial: false }), async (req, res) => {
    try {
      const created = await AssistantKnowledgeEntry.create({
        ...req.validated,
        createdBy: req.user?._id || null,
        updatedBy: req.user?._id || null,
      });

      await recordAuditLog(req, {
        action: "assistant.knowledge.created",
        entityType: "assistant_knowledge",
        entityId: created._id,
        summary: `Intrarea de knowledge base "${created.title}" a fost creata.`,
        metadata: buildEntryResponse(created),
      });

      res.status(201).json({
        ok: true,
        item: buildEntryResponse(created),
      });
    } catch (error) {
      logger.error("assistant_admin_create_failed", {
        requestId: req.id,
        error: serializeError(error),
      });
      res
        .status(500)
        .json({ message: "Nu am putut crea intrarea din knowledge base." });
    }
  })
);

router.patch(
  "/admin/:id",
  authRequired,
  roleCheck("admin", "patiser"),
  adminMutationLimiter,
  withValidation(
    (req) => ({
      id: readMongoId(req.params?.id, { field: "id", required: true }),
      ...extractPayload(req.body, { partial: true }),
    }),
    async (req, res) => {
      try {
        const item = await AssistantKnowledgeEntry.findById(req.validated.id);
        if (!item) {
          return res.status(404).json({ message: "Intrarea nu exista." });
        }

        const { id, ...changes } = req.validated;
        const hasChanges = Object.values(changes).some((value) => value !== undefined);
        if (!hasChanges) {
          return res.status(400).json({ message: "Nu exista campuri de actualizat." });
        }

        Object.assign(item, changes, {
          updatedBy: req.user?._id || null,
        });
        await item.save();

        await recordAuditLog(req, {
          action: "assistant.knowledge.updated",
          entityType: "assistant_knowledge",
          entityId: item._id,
          summary: `Intrarea de knowledge base "${item.title}" a fost actualizata.`,
          metadata: buildEntryResponse(item),
        });

        res.json({
          ok: true,
          item: buildEntryResponse(item),
        });
      } catch (error) {
        logger.error("assistant_admin_update_failed", {
          requestId: req.id,
          error: serializeError(error),
        });
        res.status(500).json({ message: "Nu am putut actualiza intrarea." });
      }
    }
  )
);

router.delete(
  "/admin/:id",
  authRequired,
  roleCheck("admin", "patiser"),
  adminMutationLimiter,
  withValidation(
    (req) => ({
      id: readMongoId(req.params?.id, { field: "id", required: true }),
    }),
    async (req, res) => {
      try {
        const item = await AssistantKnowledgeEntry.findByIdAndDelete(req.validated.id);
        if (!item) {
          return res.status(404).json({ message: "Intrarea nu exista." });
        }

        await recordAuditLog(req, {
          action: "assistant.knowledge.deleted",
          entityType: "assistant_knowledge",
          entityId: item._id,
          summary: `Intrarea de knowledge base "${item.title}" a fost stearsa.`,
          metadata: buildEntryResponse(item),
        });

        res.json({ ok: true });
      } catch (error) {
        logger.error("assistant_admin_delete_failed", {
          requestId: req.id,
          error: serializeError(error),
        });
        res.status(500).json({ message: "Nu am putut sterge intrarea." });
      }
    }
  )
);

router.patch(
  "/admin/questions/:id",
  authRequired,
  roleCheck("admin", "patiser"),
  adminMutationLimiter,
  withValidation(
    (req) => ({
      id: readMongoId(req.params?.id, { field: "id", required: true }),
      ...extractQuestionGapPatchPayload(req.body),
    }),
    async (req, res) => {
      try {
        const item = await AssistantQuestionGap.findById(req.validated.id)
          .populate("linkedKnowledgeEntryId", "title active")
          .populate("updatedBy", "nume email");
        if (!item) {
          return res.status(404).json({ message: "Intrebarea nu exista." });
        }

        const { id, ...changes } = req.validated;
        const hasChanges = Object.values(changes).some((value) => value !== undefined);
        if (!hasChanges) {
          return res.status(400).json({ message: "Nu exista campuri de actualizat." });
        }

        if (changes.status !== undefined) {
          item.status = changes.status;
          item.resolvedAt = changes.status === "rezolvata" ? new Date() : null;
        }
        if (changes.notes !== undefined) {
          item.notes = changes.notes;
        }
        if (changes.linkedKnowledgeEntryId !== undefined) {
          item.linkedKnowledgeEntryId = changes.linkedKnowledgeEntryId || null;
        }

        item.updatedBy = req.user?._id || null;
        await item.save();
        await item.populate("linkedKnowledgeEntryId", "title active");
        await item.populate("updatedBy", "nume email");

        await recordAuditLog(req, {
          action: "assistant.question_gap.updated",
          entityType: "assistant_question_gap",
          entityId: item._id,
          summary: `Intrebarea nerecunoscuta "${item.query}" a fost actualizata.`,
          metadata: buildQuestionGapResponse(item),
        });

        res.json({
          ok: true,
          item: buildQuestionGapResponse(item),
        });
      } catch (error) {
        logger.error("assistant_question_gap_update_failed", {
          requestId: req.id,
          error: serializeError(error),
        });
        res.status(500).json({
          message: "Nu am putut actualiza intrebarile pentru review.",
        });
      }
    }
  )
);

module.exports = router;
