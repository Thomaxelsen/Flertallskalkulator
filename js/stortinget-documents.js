(function () {
    const API_BASE = "https://data.stortinget.no/eksport/";
    const PAGE_SIZE = 25;

    const DOCUMENT_TYPES = {
        skriftligesporsmal: {
            title: "Skriftlige spørsmål",
            endpoint: "skriftligesporsmal",
            friendlyName: "skriftlig spørsmål"
        },
        interpellasjoner: {
            title: "Interpellasjoner",
            endpoint: "interpellasjoner",
            friendlyName: "interpellasjon"
        },
        sporretimesporsmal: {
            title: "Spørretimespørsmål",
            endpoint: "sporretimesporsmal",
            friendlyName: "spørretimespørsmål"
        }
    };

    const state = {
        page: 1,
        hasMore: true,
        loading: false,
        cachedItems: [],
        filters: {
            type: "skriftligesporsmal",
            fromDate: "",
            toDate: ""
        }
    };

    const elements = {
        documentTypeSelect: document.getElementById("documentTypeSelect"),
        fromDate: document.getElementById("fromDate"),
        toDate: document.getElementById("toDate"),
        loadButton: document.getElementById("loadDocumentsBtn"),
        clearButton: document.getElementById("clearFiltersBtn"),
        loadMoreButton: document.getElementById("loadMoreBtn"),
        statusMessage: document.getElementById("statusMessage"),
        list: document.getElementById("documentsList")
    };

    function init() {
        if (!elements.list) {
            console.error("Stortinget documents: Mangler forventede DOM-elementer.");
            return;
        }

        elements.documentTypeSelect.addEventListener("change", (event) => {
            state.filters.type = event.target.value;
        });

        elements.fromDate.addEventListener("change", (event) => {
            state.filters.fromDate = event.target.value;
            filterAndRender();
        });

        elements.toDate.addEventListener("change", (event) => {
            state.filters.toDate = event.target.value;
            filterAndRender();
        });

        elements.loadButton.addEventListener("click", () => {
            resetAndFetch();
        });

        elements.clearButton.addEventListener("click", () => {
            elements.fromDate.value = "";
            elements.toDate.value = "";
            state.filters.fromDate = "";
            state.filters.toDate = "";
            filterAndRender();
        });

        elements.loadMoreButton.addEventListener("click", () => {
            if (!state.hasMore || state.loading) {
                return;
            }
            state.page += 1;
            fetchDocuments();
        });
    }

    function resetAndFetch() {
        state.page = 1;
        state.cachedItems = [];
        state.hasMore = true;
        elements.list.innerHTML = "";
        fetchDocuments();
    }

    function buildApiUrl() {
        const current = DOCUMENT_TYPES[state.filters.type];
        if (!current) {
            throw new Error("Ukjent dokumenttype valgt.");
        }
        const params = new URLSearchParams({
            format: "JSON",
            side: String(state.page),
            antall: String(PAGE_SIZE),
            status: "alle"
        });
        return `${API_BASE}${current.endpoint}?${params.toString()}`;
    }

    function createUserFacingError(message, type, meta = {}) {
        const error = new Error(message);
        error.userMessage = message;
        error.type = type;
        error.meta = meta;
        return error;
    }

    function sanitizeErrorBody(bodyText) {
        if (!bodyText) {
            return "";
        }
        return bodyText
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/gi, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function truncate(text, maxLength = 280) {
        if (typeof text !== "string") {
            return "";
        }
        if (text.length <= maxLength) {
            return text;
        }
        return `${text.slice(0, maxLength - 1).trim()}…`;
    }

    async function fetchDocuments() {
        const url = buildApiUrl();
        state.loading = true;
        showStatus("Henter data fra Stortinget …", "info");
        toggleLoadMore(false);

        try {
            const response = await fetch(url, {
                headers: buildHeaders()
            });

            const contentType = response.headers.get("content-type") || "";

            if (!response.ok) {
                const errorText = await response.text();
                const sanitized = sanitizeErrorBody(errorText);

                if (response.status === 404 && /<html/i.test(errorText)) {
                    throw createUserFacingError(
                        "Stortinget returnerte 404 for forespørselen. Kontroller at valgt dokumenttype støttes og at " +
                            `${url} er gyldig.`,
                        "notFound",
                        { url, bodyPreview: sanitized }
                    );
                }

                const reason = sanitized ? truncate(sanitized) : (response.statusText || "ukjent feil");
                throw createUserFacingError(`Feil ${response.status}: ${reason}`, "httpError", {
                    status: response.status,
                    url,
                    bodyPreview: sanitized
                });
            }

            if (!/json/i.test(contentType)) {
                const unexpectedBody = await response.text();
                const sanitized = sanitizeErrorBody(unexpectedBody).slice(0, 200);
                throw createUserFacingError(
                    "Stortinget returnerte et svar som ikke var JSON. Dette kan skje ved midlertidige driftsavvik eller dersom " +
                        "API-et krever nøkkel.",
                    "unexpectedFormat",
                    { url, bodyPreview: sanitized }
                );
            }

            const data = await response.json();
            const items = extractItems(data);
            if (!Array.isArray(items)) {
                throw createUserFacingError("Uventet datastruktur fra API-et.", "invalidData", { url });
            }

            state.cachedItems = state.cachedItems.concat(items);
            if (items.length < PAGE_SIZE) {
                state.hasMore = false;
            }

            filterAndRender();
            updateLoadMoreVisibility();
            if (state.cachedItems.length === 0) {
                showStatus("Fant ingen spørsmål for valgt type.", "info");
            } else {
                const typeName = DOCUMENT_TYPES[state.filters.type].friendlyName;
                showStatus(`Viser ${state.cachedItems.length} ${typeName}${state.cachedItems.length === 1 ? "" : "er"}.`, "success");
            }
        } catch (error) {
            console.error("Klarte ikke å hente spørsmål", error, error?.meta || null);
            if (error.userMessage) {
                const statusType = error.type === "notFound" ? "warning" : "error";
                showStatus(error.userMessage, statusType);
            } else {
                showStatus(`Kunne ikke hente data: ${error.message}`, "error");
            }
        } finally {
            state.loading = false;
            updateLoadMoreVisibility();
        }
    }

    function buildHeaders() {
        const headers = {
            "Accept": "application/json"
        };
        return headers;
    }

    function extractItems(data) {
        if (!data || typeof data !== "object") {
            return [];
        }

        const listKey = Object.keys(data).find((key) => key.endsWith("_liste"));
        const list = listKey ? data[listKey] : null;
        if (!list) {
            return [];
        }

        if (Array.isArray(list)) {
            return list;
        }

        const potentialArrays = Object.values(list).filter(Array.isArray);
        if (potentialArrays.length > 0) {
            return potentialArrays[0];
        }

        if (Array.isArray(list?.resultat)) {
            return list.resultat;
        }

        return list ? [list] : [];
    }

    function filterAndRender() {
        const filtered = state.cachedItems.filter((item) => matchesDate(item));
        renderDocuments(filtered);
    }

    function matchesDate(item) {
        if (!state.filters.fromDate && !state.filters.toDate) {
            return true;
        }
        const itemDateValue = pickValue(item, [
            ["dato"],
            ["registrert_dato"],
            ["dokdato"],
            ["innsendt_dato"],
            ["publisert_dato"],
            ["mottatt", "dato"],
            ["sak", "opprettet_dato"]
        ]);
        if (!itemDateValue) {
            return false;
        }
        const itemDate = new Date(itemDateValue);
        if (Number.isNaN(itemDate.getTime())) {
            return false;
        }
        if (state.filters.fromDate) {
            const from = new Date(state.filters.fromDate);
            if (itemDate < from) {
                return false;
            }
        }
        if (state.filters.toDate) {
            const to = new Date(state.filters.toDate);
            to.setHours(23, 59, 59, 999);
            if (itemDate > to) {
                return false;
            }
        }
        return true;
    }

    function renderDocuments(items) {
        elements.list.innerHTML = "";
        if (!items || items.length === 0) {
            const placeholder = document.createElement("div");
            placeholder.className = "document-card empty";
            placeholder.textContent = "Ingen spørsmål å vise med valgt filtrering.";
            elements.list.appendChild(placeholder);
            return;
        }

        const fragment = document.createDocumentFragment();
        items.forEach((item) => {
            fragment.appendChild(createDocumentCard(item));
        });
        elements.list.appendChild(fragment);
    }

    function createDocumentCard(item) {
        const card = document.createElement("article");
        card.className = "document-card";

        const title = pickValue(item, [
            ["tittel"],
            ["sak", "tittel"],
            ["dokumentreferanse"],
            ["korttittel"],
            ["overskrift"],
            ["innhold", "tittel"]
        ]) || DOCUMENT_TYPES[state.filters.type].title;

        const primaryLink = pickValue(item, [
            ["lenke"],
            ["url"],
            ["sak", "lenke"],
            ["sak", "url"],
            ["dokument", "lenke"],
            ["dokument", "url"]
        ]);

        const description = pickValue(item, [
            ["sammendrag"],
            ["sporsmalstekst"],
            ["begrunnelse"],
            ["interpellasjonstekst"],
            ["innhold", "tekst"]
        ]);

        const dateValue = pickValue(item, [
            ["dato"],
            ["registrert_dato"],
            ["dokdato"],
            ["innsendt_dato"],
            ["publisert_dato"],
            ["mottatt", "dato"],
            ["sak", "opprettet_dato"]
        ]);
        const formattedDate = formatDate(dateValue);

        const metadataItems = [];
        const status = pickValue(item, [["status"], ["sak", "status"], ["dokumentstatus"]]);
        if (status) {
            metadataItems.push({ label: "Status", value: status });
        }
        const referanse = pickValue(item, [["referanse"], ["sak", "referanse"], ["dokumentreferanse"]]);
        if (referanse) {
            metadataItems.push({ label: "Referanse", value: referanse });
        }
        const proposer = pickValue(item, [
            ["representant", "navn"],
            ["sporsmalstiller", "navn"],
            ["sporsmal_fra", "navn"],
            ["innsender", "navn"],
            ["person", "navn"]
        ]);
        if (proposer) {
            metadataItems.push({ label: "Spørsmål fra", value: proposer });
        }

        const header = document.createElement("header");
        header.className = "document-card__header";
        const titleElement = document.createElement(primaryLink ? "a" : "h3");
        titleElement.className = "document-card__title";
        titleElement.textContent = title;
        if (primaryLink) {
            titleElement.href = primaryLink;
            titleElement.target = "_blank";
            titleElement.rel = "noopener";
        }
        header.appendChild(titleElement);

        if (formattedDate) {
            const dateBadge = document.createElement("span");
            dateBadge.className = "document-card__date";
            dateBadge.textContent = formattedDate;
            header.appendChild(dateBadge);
        }

        const body = document.createElement("div");
        body.className = "document-card__body";
        if (description) {
            const descriptionElement = document.createElement("p");
            descriptionElement.className = "document-card__description";
            descriptionElement.textContent = description;
            body.appendChild(descriptionElement);
        }

        if (metadataItems.length > 0) {
            const metadataList = document.createElement("dl");
            metadataList.className = "document-card__metadata";
            metadataItems.forEach(({ label, value }) => {
                const dt = document.createElement("dt");
                dt.textContent = label;
                const dd = document.createElement("dd");
                dd.textContent = value;
                metadataList.appendChild(dt);
                metadataList.appendChild(dd);
            });
            body.appendChild(metadataList);
        }

        const details = document.createElement("details");
        details.className = "document-card__raw";
        const summary = document.createElement("summary");
        summary.textContent = "Vis rådata";
        details.appendChild(summary);
        const pre = document.createElement("pre");
        pre.textContent = JSON.stringify(item, null, 2);
        details.appendChild(pre);

        card.appendChild(header);
        card.appendChild(body);
        card.appendChild(details);
        return card;
    }

    function pickValue(source, paths) {
        for (const path of paths) {
            const value = path.reduce((acc, key) => {
                if (Array.isArray(acc)) {
                    const index = Number.isNaN(Number(key)) ? null : Number(key);
                    return index !== null && index < acc.length ? acc[index] : undefined;
                }
                if (acc && typeof acc === "object" && key in acc) {
                    return acc[key];
                }
                return undefined;
            }, source);

            if (value === undefined || value === null || value === "") {
                continue;
            }

            if (typeof value === "string" || typeof value === "number") {
                return String(value);
            }

            if (Array.isArray(value)) {
                const joined = value
                    .map((entry) => (typeof entry === "string" || typeof entry === "number") ? String(entry) : null)
                    .filter(Boolean)
                    .join(", ");
                if (joined) {
                    return joined;
                }
            }

            if (typeof value === "object") {
                const nestedCandidate = value.tekst || value.navn || value.tittel || value.verdi || value.id || value.dato || value.url;
                if (nestedCandidate) {
                    return String(nestedCandidate);
                }
            }
        }
        return null;
    }

    function formatDate(dateString) {
        if (!dateString) {
            return "";
        }
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) {
            return dateString;
        }
        return date.toLocaleDateString("nb-NO", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    function showStatus(message, type = "info") {
        if (!elements.statusMessage) {
            return;
        }
        elements.statusMessage.textContent = message;
        elements.statusMessage.className = `status-message status-${type}`;
    }

    function toggleLoadMore(show) {
        if (!elements.loadMoreButton) {
            return;
        }
        elements.loadMoreButton.hidden = !show;
        elements.loadMoreButton.disabled = !show;
    }

    function updateLoadMoreVisibility() {
        if (!elements.loadMoreButton) {
            return;
        }
        const shouldShow = state.hasMore && !state.loading;
        elements.loadMoreButton.hidden = !shouldShow;
        elements.loadMoreButton.disabled = !shouldShow;
    }

    document.addEventListener("DOMContentLoaded", init);
})();
