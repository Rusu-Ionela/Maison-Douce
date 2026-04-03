import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import OrderFlowIntakeCalculator from "../components/order-flow/OrderFlowIntakeCalculator";
import OrderFlowProgress from "../components/order-flow/OrderFlowProgress";
import OrderTypeChoice from "../components/order-flow/OrderTypeChoice";
import {
  buildOrderFlowHref,
  calculateOrderFlowEstimate,
  getOrderTypeMeta,
  loadOrderFlowContext,
  normalizeOrderFlowContext,
  readOrderFlowContextFromSearch,
  saveOrderFlowContext,
} from "../lib/orderFlow";
import { buttons, cards, containers } from "../lib/tailwindComponents";
import { useAuth } from "../context/AuthContext";

function buildDraftFromContext(context) {
  return {
    persons: context?.persons || 20,
    eventType: context?.eventType || "aniversare",
    portionStyle: context?.portionStyle || "normal",
  };
}

export default function ComandaOnline() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth() || {};

  const routeContext = useMemo(
    () => readOrderFlowContextFromSearch(location.search),
    [location.search]
  );
  const storedContext = useMemo(
    () => (!routeContext ? loadOrderFlowContext() : null),
    [routeContext]
  );

  const [draft, setDraft] = useState(() => buildDraftFromContext(routeContext || storedContext));
  const [showChoices, setShowChoices] = useState(
    Boolean(routeContext?.hasContext || storedContext?.hasContext)
  );

  useEffect(() => {
    const nextContext = routeContext || storedContext;
    if (!nextContext?.hasContext) return;
    setDraft(buildDraftFromContext(nextContext));
    setShowChoices(true);
  }, [routeContext, storedContext]);

  const estimate = useMemo(
    () =>
      calculateOrderFlowEstimate({
        persons: draft.persons,
        portionStyle: draft.portionStyle,
      }),
    [draft.persons, draft.portionStyle]
  );

  const context = useMemo(
    () =>
      normalizeOrderFlowContext({
        ...draft,
      }),
    [draft]
  );

  useEffect(() => {
    if (!context.hasContext) return;
    saveOrderFlowContext(context);
  }, [context]);

  const setDraftField = (field, value) => {
    setDraft((current) => ({
      ...current,
      [field]: field === "persons" ? Number.parseInt(String(value || ""), 10) || "" : value,
    }));
  };

  const handleSelectType = (orderType) => {
    const typeMeta = getOrderTypeMeta(orderType);
    if (!typeMeta) return;

    const nextContext = normalizeOrderFlowContext({
      ...draft,
      orderType,
    });
    saveOrderFlowContext(nextContext);
    navigate(buildOrderFlowHref(typeMeta.route, nextContext));
  };

  return (
    <div className="min-h-screen">
      <div className={`${containers.pageMax} max-w-editorial space-y-6`}>
        <header className={`${cards.tinted} overflow-hidden`}>
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-500">
                Comanda online
              </div>
              <div>
                <div className="font-script text-4xl text-pink-500">Maison-Douce order flow</div>
                <h1 className="mt-2 text-4xl font-semibold text-gray-900 md:text-5xl">
                  Un traseu clar pentru clientii care intra prima data pe site
                </h1>
              </div>
              <p className="max-w-3xl text-base leading-8 text-[#655c53]">
                In loc sa intri direct intr-o pagina complicata, pornesti cu o estimare simpla,
                alegi directia potrivita si continui in catalog, constructor sau generatorul de idei.
                Fiecare etapa ramane vizibila si usor de urmat.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/catalog" className={buttons.outline}>
                  Vezi catalogul direct
                </Link>
                <Link to="/constructor" className={buttons.outline}>
                  Sari direct in constructor
                </Link>
              </div>
            </div>

            <div className={`${cards.default} grid gap-3 self-start`}>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-600">
                Cum functioneaza
              </div>
              <OrderFlowProgress
                currentStep={showChoices ? "choose" : "estimate"}
                compact
              />
              <div className="rounded-[22px] border border-rose-100 bg-white/80 px-4 py-3 text-sm leading-6 text-[#655c53]">
                {isAuthenticated ? (
                  <>
                    Daca nu esti hotarat inca, fluxul te ajuta sa decizi. Dupa ce alegi directia,
                    poti reveni oricand in{" "}
                    <span className="font-semibold text-gray-900">Drafturile mele</span>.
                  </>
                ) : (
                  <>
                    Daca nu esti hotarat inca, fluxul te ajuta sa decizi. Iti poti salva
                    drafturile imediat dupa autentificare, fara sa pierzi estimarea deja facuta.
                  </>
                )}
              </div>
              {isAuthenticated ? (
                <Link to="/personalizari" className={buttons.secondary}>
                  Drafturile mele
                </Link>
              ) : (
                <Link to="/login" className={buttons.secondary}>
                  Intra pentru a salva drafturi
                </Link>
              )}
            </div>
          </div>
        </header>

        <OrderFlowIntakeCalculator
          draft={draft}
          result={estimate}
          onChange={setDraftField}
          onContinue={() => setShowChoices(true)}
        />

        {showChoices ? (
          <OrderTypeChoice context={context} onSelect={handleSelectType} />
        ) : null}
      </div>
    </div>
  );
}
