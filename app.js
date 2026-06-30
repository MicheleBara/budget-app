'use strict';

// ========================
// STATO GLOBALE
// ========================
let stato = {
    configurato: false,
    giornoFiscale: 1,
    valuta: '€',
    valutaCodice: 'EUR',
    capitale: 0,
    transazioni: [],
    categorieCustom: {   // sostituisce categorieExtra, gestisce sia default rinominati che nuovi
        entrata: [],     // [{id, nome, nomeOriginale}] — nomeOriginale=null se è nuova
        uscita:  []
    }
};

// Categorie predefinite (non eliminabili, ma rinominabili)
const CATEGORIE_DEFAULT = {
    entrata: ['Stipendio','Freelance','Rendite','Regalo','Rimborso','Altro'],
    uscita:  ['Casa','Cibo','Trasporti','Salute','Svago','Abbigliamento','Tecnologia','Viaggi','Bollette','Abbonamenti','Altro']
};

const EMOJI_CAT = {
    'Stipendio':'💼','Freelance':'💻','Rendite':'📊','Regalo':'🎁','Rimborso':'↩️',
    'Casa':'🏠','Cibo':'🛒','Trasporti':'🚌','Salute':'💊','Svago':'🎭',
    'Abbigliamento':'👕','Tecnologia':'📱','Viaggi':'✈️','Bollette':'⚡',
    'Abbonamenti':'📺','Altro':'🔹'
};

const PALETTE_ENTRATE = ['#4caf50','#66bb6a','#81c784','#a5d6a7','#c8e6c9','#2e7d32','#43a047','#1b5e20','#388e3c','#00c853'];
const PALETTE_USCITE  = ['#e53935','#ef5350','#f44336','#e57373','#ffcdd2','#c62828','#d32f2f','#b71c1c','#ff5252','#ff1744'];

// Database curato di asset comuni con rendimenti storici medi annui di riferimento.
// Usato per l'autocomplete istantaneo; se l'utente non trova l'asset, può comunque
// usare la ricerca libera (fallback via Claude).
const DATABASE_ASSET = [
    { nome:'S&P 500', ticker:'SPY / VOO', rendimento:10.2, periodo:'1990-2024', note:'Indice azionario USA, alta diversificazione', tags:['sp500','s&p','s&p500','standard poor','america','usa'] },
    { nome:'Nasdaq 100', ticker:'QQQ', rendimento:13.5, periodo:'1990-2024', note:'Tech-heavy, volatilità più alta', tags:['nasdaq','tech','qqq'] },
    { nome:'FTSE All-World', ticker:'VWCE / VWRL', rendimento:8.8, periodo:'2000-2024', note:'Azionario globale ampiamente diversificato', tags:['ftse all-world','all world','vwce','vwrl','vanguard world'] },
    { nome:'MSCI World', ticker:'URTH / IWDA', rendimento:8.5, periodo:'1990-2024', note:'Azionario globale paesi sviluppati', tags:['msci world','msci','iwda','world'] },
    { nome:'MSCI Emerging Markets', ticker:'EEM / IEMG', rendimento:7.2, periodo:'1995-2024', note:'Mercati emergenti, volatilità elevata', tags:['msci emerging','emerging markets','mercati emergenti','eem'] },
    { nome:'FTSE MIB', ticker:'EWI', rendimento:5.8, periodo:'2000-2024', note:'Principale indice della Borsa Italiana', tags:['ftse mib','mib','borsa italiana','italia'] },
    { nome:'Euro Stoxx 50', ticker:'FEZ', rendimento:6.5, periodo:'2000-2024', note:'Principali 50 aziende europee', tags:['euro stoxx','stoxx 50','europa','europe'] },
    { nome:'DAX', ticker:'DAX', rendimento:7.8, periodo:'1990-2024', note:'Principale indice tedesco', tags:['dax','germania','germany'] },
    { nome:'Dow Jones Industrial', ticker:'DIA', rendimento:9.6, periodo:'1990-2024', note:'30 grandi aziende USA blue-chip', tags:['dow jones','dow','djia'] },
    { nome:'Russell 2000', ticker:'IWM', rendimento:8.9, periodo:'1990-2024', note:'Small-cap USA, più volatile', tags:['russell 2000','russell','small cap'] },
    { nome:'Nikkei 225', ticker:'NKY', rendimento:6.2, periodo:'1990-2024', note:'Principale indice giapponese', tags:['nikkei','giappone','japan'] },
    { nome:'Oro', ticker:'GLD / XAU', rendimento:7.0, periodo:'1990-2024', note:'Bene rifugio, basso rendimento ma stabilizzante', tags:['oro','gold','xau'] },
    { nome:'Argento', ticker:'SLV / XAG', rendimento:5.5, periodo:'1990-2024', note:'Materia prima, alta volatilità', tags:['argento','silver','xag'] },
    { nome:'Petrolio (WTI)', ticker:'USO / WTI', rendimento:4.0, periodo:'1990-2024', note:'Materia prima molto volatile', tags:['petrolio','oil','wti','crude'] },
    { nome:'Bitcoin', ticker:'BTC', rendimento:45.0, periodo:'2013-2024', note:'Altissima volatilità, dato puramente illustrativo', tags:['bitcoin','btc','crypto','criptovaluta'] },
    { nome:'Ethereum', ticker:'ETH', rendimento:55.0, periodo:'2016-2024', note:'Altissima volatilità, dato puramente illustrativo', tags:['ethereum','eth'] },
    { nome:'BTP Italia (10 anni)', ticker:'BTP', rendimento:3.5, periodo:'2010-2024', note:'Titolo di stato italiano, basso rischio', tags:['btp','btp italia','titoli di stato','obbligazioni italia'] },
    { nome:'Bund Tedeschi (10 anni)', ticker:'BUND', rendimento:2.2, periodo:'2010-2024', note:'Titolo di stato tedesco, rischio molto basso', tags:['bund','germania bond','titoli stato tedeschi'] },
    { nome:'US Treasury (10 anni)', ticker:'TLT', rendimento:3.8, periodo:'2000-2024', note:'Titoli di stato USA a lungo termine', tags:['treasury','us bond','t-bond','tlt'] },
    { nome:'Obbligazioni corporate globali', ticker:'AGG', rendimento:4.2, periodo:'2003-2024', note:'Obbligazionario diversificato, rischio medio-basso', tags:['corporate bond','obbligazioni corporate','agg'] },
    { nome:'REIT immobiliare USA', ticker:'VNQ', rendimento:8.0, periodo:'2004-2024', note:'Real estate quotato, sensibile ai tassi', tags:['reit','immobiliare','real estate','vnq'] },
    { nome:'Berkshire Hathaway', ticker:'BRK.B', rendimento:10.5, periodo:'1990-2024', note:'Holding diversificata guidata da Buffett', tags:['berkshire','buffett','brk'] }
];

let suggerimentiAssetVisibili = false;

let chartEntrate = null;
let chartUscite  = null;
let chartSavings = null;
let chartDashE   = null;
let chartDashU   = null;

let setupStep = 1;
let setupGiornoTemp = null;
let setupValutaTemp = { valuta: '€', codice: 'EUR' };
let modaleVoceTipo = 'entrata';
let giornoImpTemp  = null;
let valutaImpTemp  = null;

// Mese fiscale selezionato nella sidebar (null = corrente)
let meseSidebarSelezionato = null;

// Ricerca asset
let assetTrovato = null; // { nome, ticker, rendimento }

// ========================
// INIT
// ========================
document.addEventListener('DOMContentLoaded', () => {
    caricaStato();
    migrazioneCategorieExtra();
    if (!stato.configurato) {
        apriSetup();
    } else {
        aggiornaTuttoUI();
    }
});

// Registrazione Service Worker per funzionamento offline e installazione PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => {
            console.warn('Registrazione Service Worker non riuscita:', err);
        });
    });
}

// Migrazione da categorieExtra (v1.0) a categorieCustom (v1.1)
function migrazioneCategorieExtra() {
    if (stato.categorieExtra && !stato.categorieCustom) {
        stato.categorieCustom = { entrata: [], uscita: [] };
        ['entrata','uscita'].forEach(t => {
            (stato.categorieExtra[t] || []).forEach(nome => {
                stato.categorieCustom[t].push({ id: genId(), nome, nomeOriginale: null });
            });
        });
        delete stato.categorieExtra;
        salvaStato();
    }
    if (!stato.categorieCustom) stato.categorieCustom = { entrata: [], uscita: [] };
}

function caricaStato() {
    const raw = localStorage.getItem('budget_stato');
    if (raw) {
        try { stato = { ...stato, ...JSON.parse(raw) }; }
        catch(e) { console.warn('Errore caricamento stato:', e); }
    }
}
function salvaStato() { localStorage.setItem('budget_stato', JSON.stringify(stato)); }
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

// ========================
// CATEGORIE HELPER
// ========================
function getCategorieEffettive(tipo) {
    // Restituisce array di nomi visualizzati, tenendo conto di rinominate
    const custom = stato.categorieCustom[tipo] || [];
    const rinominate = {};
    custom.filter(c => c.nomeOriginale).forEach(c => { rinominate[c.nomeOriginale] = c.nome; });
    const nuove = custom.filter(c => !c.nomeOriginale).map(c => c.nome);
    const result = CATEGORIE_DEFAULT[tipo].map(n => rinominate[n] || n);
    return [...result, ...nuove];
}

function getNomeCanonicoCategoria(tipo, nomeVisualizzato) {
    // Dato un nome visualizzato, trova il nome "canonico" da salvare nelle transazioni
    // Per semplicità salviamo direttamente il nome visualizzato
    return nomeVisualizzato;
}

// ========================
// SETUP INIZIALE
// ========================
function apriSetup() {
    setupStep = 1;
    setupGiornoTemp = stato.giornoFiscale || 1;
    setupValutaTemp = { valuta: stato.valuta || '€', codice: stato.valutaCodice || 'EUR' };
    costruisciGrigliaGiorni('griglia-giorni', setupGiornoTemp, g => { setupGiornoTemp = g; });
    document.getElementById('modale-setup').style.display = 'flex';
    mostraStepSetup(1);
}
function mostraStepSetup(step) {
    document.getElementById('setup-step-1').style.display = step === 1 ? 'block' : 'none';
    document.getElementById('setup-step-2').style.display = step === 2 ? 'block' : 'none';
    document.getElementById('btn-setup-avanti').textContent = step === 1 ? 'Avanti →' : '✅ Inizia';
    document.getElementById('btn-setup-indietro').style.display = step === 2 ? 'inline-block' : 'none';
}
function setupAvanti() {
    if (setupStep === 1) {
        if (!setupGiornoTemp) { alert('Seleziona il giorno di inizio del tuo mese fiscale.'); return; }
        setupStep = 2;
        document.querySelectorAll('#setup-step-2 .valuta-btn').forEach(b => {
            b.classList.toggle('attivo', b.dataset.codice === setupValutaTemp.codice);
        });
        mostraStepSetup(2);
    } else {
        stato.configurato = true;
        stato.giornoFiscale = setupGiornoTemp;
        stato.valuta = setupValutaTemp.valuta;
        stato.valutaCodice = setupValutaTemp.codice;
        salvaStato();
        document.getElementById('modale-setup').style.display = 'none';
        aggiornaTuttoUI();
    }
}
function setupIndietro() { setupStep = 1; mostraStepSetup(1); }
function selezionaValuta(btn) {
    document.querySelectorAll('#setup-step-2 .valuta-btn').forEach(b => b.classList.remove('attivo'));
    btn.classList.add('attivo');
    setupValutaTemp = { valuta: btn.dataset.valuta, codice: btn.dataset.codice };
}

// ========================
// GRIGLIA GIORNI
// ========================
function costruisciGrigliaGiorni(containerId, giornoAttivo, onSelect) {
    const cont = document.getElementById(containerId);
    if (!cont) return;
    cont.innerHTML = '';
    for (let i = 1; i <= 28; i++) {
        const btn = document.createElement('button');
        btn.className = 'giorno-btn' + (i === giornoAttivo ? ' selezionato' : '');
        btn.textContent = i;
        btn.onclick = () => {
            cont.querySelectorAll('.giorno-btn').forEach(b => b.classList.remove('selezionato'));
            btn.classList.add('selezionato');
            onSelect(i);
        };
        cont.appendChild(btn);
    }
}

// ========================
// NAVIGAZIONE VISTE
// ========================
function mostraVista(id) {
    document.querySelectorAll('.vista').forEach(v => v.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('attivo'));
    const mappa = {
        'vista-dashboard':'nav-dashboard','vista-entrate':'nav-entrate',
        'vista-uscite':'nav-uscite','vista-savings':'nav-savings',
        'vista-impostazioni':'nav-impostazioni'
    };
    if (mappa[id]) document.getElementById(mappa[id]).classList.add('attivo');
    if (id === 'vista-dashboard')    renderDashboard();
    if (id === 'vista-entrate')      renderEntrate();
    if (id === 'vista-uscite')       renderUscite();
    if (id === 'vista-savings')      renderSavings();
    if (id === 'vista-impostazioni') renderImpostazioni();
}
function tornaAllaHome() { mostraVista('vista-dashboard'); }

// ========================
// UTILITY DATE
// ========================
function getPeriodoFiscale(data) {
    const g = stato.giornoFiscale;
    const d = data ? new Date(data) : new Date();
    let anno = d.getFullYear(), mese = d.getMonth();
    let inizio;
    if (d.getDate() >= g) {
        inizio = new Date(anno, mese, g);
    } else {
        inizio = mese === 0 ? new Date(anno-1, 11, g) : new Date(anno, mese-1, g);
    }
    const ms = inizio.getMonth()+1;
    const as = ms > 11 ? inizio.getFullYear()+1 : inizio.getFullYear();
    const fine = new Date(as, ms > 11 ? 0 : ms, g-1);
    return { inizio, fine };
}

function getPeriodoFiscalePrecedente() {
    const { inizio } = getPeriodoFiscale(new Date());
    const fine = new Date(inizio.getTime() - 86400000);
    const inizioPrec = new Date(fine.getFullYear(), fine.getMonth(), stato.giornoFiscale);
    if (inizioPrec > fine) inizioPrec.setMonth(inizioPrec.getMonth()-1);
    return { inizio: inizioPrec, fine };
}

function isInPeriodo(dataStr, periodo) {
    const d = new Date(dataStr);
    return d >= periodo.inizio && d <= periodo.fine;
}

function formatData(dataStr) {
    return new Date(dataStr).toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric' });
}
function formatImporto(num) {
    return stato.valuta + ' ' + (num||0).toLocaleString('it-IT', { minimumFractionDigits:2, maximumFractionDigits:2 });
}
function formatPeriodo(inizio, fine) {
    const o = { day:'numeric', month:'long' };
    return inizio.toLocaleDateString('it-IT', o) + ' – ' + fine.toLocaleDateString('it-IT', { ...o, year:'numeric' });
}
function giornicAlProssimo() {
    const g = stato.giornoFiscale;
    const oggi = new Date();
    let p = new Date(oggi.getFullYear(), oggi.getMonth(), g);
    if (p <= oggi) p.setMonth(p.getMonth()+1);
    return Math.ceil((p - oggi) / 86400000);
}

// ========================
// SIDEBAR MESI
// ========================
function getMesiDisponibili() {
    // Ritorna lista di periodi fiscali con transazioni, dal più recente al più vecchio
    // Includi sempre il mese corrente
    const oggi = new Date();
    const periodoCorrente = getPeriodoFiscale(oggi);
    const periodi = [{ ...periodoCorrente, corrente: true }];

    // Raccogli tutte le date delle transazioni
    const date = stato.transazioni.map(t => new Date(t.data)).sort((a,b) => a-b);
    if (date.length === 0) return periodi;

    // Costruisci periodi mensili tra la data più vecchia e oggi
    let cursore = new Date(date[0]);
    const limite = periodoCorrente.inizio;
    while (cursore < limite) {
        const p = getPeriodoFiscale(cursore);
        const key = p.inizio.toISOString();
        if (!periodi.find(x => x.inizio.toISOString() === key)) {
            periodi.push({ ...p, corrente: false });
        }
        cursore = new Date(p.fine.getTime() + 86400000);
    }

    return periodi.sort((a,b) => b.inizio - a.inizio);
}

function renderSidebarMesi() {
    const lista = document.getElementById('sidebar-lista-mesi');
    const dropdown = document.getElementById('select-mese-mobile');
    if (!lista) return;

    const mesi = getMesiDisponibili();
    lista.innerHTML = '';
    dropdown.innerHTML = '';

    mesi.forEach(p => {
        const trans = stato.transazioni.filter(t => isInPeriodo(t.data, p));
        const entrate = trans.filter(t => t.tipo==='entrata').reduce((s,t)=>s+t.importo,0);
        const uscite  = trans.filter(t => t.tipo==='uscita').reduce((s,t)=>s+t.importo,0);
        const saldo   = entrate - uscite;
        const chiave  = p.inizio.toISOString();
        const isSelezionato = meseSidebarSelezionato === chiave || (meseSidebarSelezionato===null && p.corrente);

        // Label mese
        const labelMese = p.inizio.toLocaleDateString('it-IT', { month:'long', year:'numeric' });
        const labelCorto = p.inizio.toLocaleDateString('it-IT', { month:'short', year:'2-digit' });
        const saldoCls   = saldo >= 0 ? 'saldo-pos' : 'saldo-neg';
        const saldoStr   = (saldo >= 0 ? '+' : '') + formatImporto(saldo);

        // Sidebar card
        const card = document.createElement('div');
        card.className = 'sidebar-mese-card' + (isSelezionato ? ' selezionato' : '');
        card.dataset.chiave = chiave;
        card.innerHTML = `
            <h4>${p.corrente ? '🔵 ' : ''}${labelMese}</h4>
            <p>${trans.length} transazioni</p>
            <div class="sidebar-mese-saldo ${saldoCls}">${saldoStr}</div>`;
        card.onclick = () => selezionaMese(chiave);
        lista.appendChild(card);

        // Dropdown mobile
        const opt = document.createElement('option');
        opt.value = chiave;
        opt.textContent = (p.corrente ? '🔵 ' : '') + labelCorto + ' — ' + saldoStr;
        if (isSelezionato) opt.selected = true;
        dropdown.appendChild(opt);
    });
}

function selezionaMese(chiave) {
    const mesi = getMesiDisponibili();
    const corrente = mesi.find(p => p.corrente);
    if (corrente && chiave === corrente.inizio.toISOString()) {
        meseSidebarSelezionato = null;
    } else {
        meseSidebarSelezionato = chiave;
    }
    renderDashboard();
}

function selezionaMeseDaDropdown() {
    const val = document.getElementById('select-mese-mobile').value;
    selezionaMese(val);
}

function getPeriodoSelezionato() {
    if (!meseSidebarSelezionato) return getPeriodoFiscale(new Date());
    const mesi = getMesiDisponibili();
    return mesi.find(p => p.inizio.toISOString() === meseSidebarSelezionato) || getPeriodoFiscale(new Date());
}

// ========================
// DASHBOARD
// ========================
function renderDashboard() {
    renderSidebarMesi();

    const periodo = getPeriodoSelezionato();
    const oggi = new Date();
    const isCorrente = !meseSidebarSelezionato || isInPeriodo(oggi.toISOString().split('T')[0], periodo);

    // Header periodo
    document.getElementById('periodo-label-testo').textContent = isCorrente ? 'Mese fiscale in corso' : 'Mese fiscale storico';
    document.getElementById('periodo-testo').textContent = formatPeriodo(periodo.inizio, periodo.fine);

    // Giorni rimasti (solo mese corrente)
    const giorniBox = document.getElementById('giorni-rimasti-box');
    if (isCorrente) {
        giorniBox.style.display = 'block';
        document.getElementById('giorni-rimasti-num').textContent = giornicAlProssimo();
    } else {
        giorniBox.style.display = 'none';
    }

    const trans = stato.transazioni.filter(t => isInPeriodo(t.data, periodo));
    const totEntrate = trans.filter(t=>t.tipo==='entrata').reduce((s,t)=>s+t.importo,0);
    const totUscite  = trans.filter(t=>t.tipo==='uscita').reduce((s,t)=>s+t.importo,0);
    const saldo = totEntrate - totUscite;

    document.getElementById('saldo-valore').textContent = formatImporto(saldo);
    document.getElementById('saldo-sub-e').textContent  = '↑ ' + formatImporto(totEntrate) + ' entrate';
    document.getElementById('saldo-sub-u').textContent  = '↓ ' + formatImporto(totUscite) + ' uscite';
    const pct = totEntrate > 0 ? Math.max(5, Math.min(100, (saldo/totEntrate)*100)) : 5;
    const barra = document.getElementById('saldo-barra');
    barra.style.width = pct + '%';
    barra.style.backgroundColor = saldo >= 0 ? 'white' : '#ffaaaa';

    document.getElementById('kpi-entrate').textContent = formatImporto(totEntrate);
    document.getElementById('kpi-uscite').textContent  = formatImporto(totUscite);
    document.getElementById('kpi-savings').textContent = formatImporto(stato.capitale);

    // Grafici torta (mostrati sempre, non solo storico)
    const graficiDiv = document.getElementById('dashboard-grafici');
    graficiDiv.style.display = 'block';
    if (chartDashE) { chartDashE.destroy(); chartDashE = null; }
    if (chartDashU) { chartDashU.destroy(); chartDashU = null; }

    // Rimonta i canvas se rimossi da precedente grafico vuoto
    const wrapE = document.querySelector('#grafico-dash-entrate')?.parentElement;
    const wrapU = document.querySelector('#grafico-dash-uscite')?.parentElement;
    if (wrapE && !document.getElementById('grafico-dash-entrate')) {
        wrapE.innerHTML = '<canvas id="grafico-dash-entrate"></canvas>';
    }
    if (wrapU && !document.getElementById('grafico-dash-uscite')) {
        wrapU.innerHTML = '<canvas id="grafico-dash-uscite"></canvas>';
    }

    chartDashE = renderGraficoTorta('grafico-dash-entrate','legenda-dash-entrate',
        trans.filter(t=>t.tipo==='entrata'), PALETTE_ENTRATE, chartDashE, c=>{ chartDashE=c; });
    chartDashU = renderGraficoTorta('grafico-dash-uscite','legenda-dash-uscite',
        trans.filter(t=>t.tipo==='uscita'), PALETTE_USCITE, chartDashU, c=>{ chartDashU=c; });

    // Transazioni
    document.getElementById('transazioni-titolo').textContent =
        isCorrente ? 'Ultime transazioni' : 'Tutte le transazioni del mese';
    document.getElementById('bottoni-aggiunta').style.display = isCorrente ? 'flex' : 'none';

    const transOrd = [...trans].sort((a,b) => new Date(b.data)-new Date(a.data)).slice(0, isCorrente ? 10 : 999);
    const cont = document.getElementById('dashboard-ultime-transazioni');
    cont.innerHTML = transOrd.length === 0
        ? '<div class="vuoto-stato"><div class="vuoto-icona">📋</div><p>Nessuna transazione in questo periodo.</p></div>'
        : transOrd.map(renderTransazioneCard).join('');
}

function renderTransazioneCard(t) {
    const emoji = EMOJI_CAT[t.categoria] || '🔹';
    const cls   = t.tipo==='entrata' ? 'importo-entrata' : 'importo-uscita';
    const segno = t.tipo==='entrata' ? '+' : '−';
    return `<div class="transazione-card">
        <div class="transazione-icona">${emoji}</div>
        <div class="transazione-info">
            <div class="transazione-desc">${escHTML(t.descrizione)}</div>
            <div class="transazione-meta">${escHTML(t.categoria)} · ${formatData(t.data)}${t.note?' · '+escHTML(t.note):''}</div>
        </div>
        <div class="transazione-importo ${cls}">${segno} ${formatImporto(t.importo)}</div>
        <button class="btn-elimina-piccolo" onclick="eliminaTransazione('${t.id}')">✕</button>
    </div>`;
}

// ========================
// ENTRATE / USCITE
// ========================
function renderEntrate() {
    const filtro = document.getElementById('filtro-mese-entrate')?.value || 'corrente';
    const trans = filtraPerPeriodo(stato.transazioni.filter(t=>t.tipo==='entrata'), filtro)
                  .sort((a,b)=>new Date(b.data)-new Date(a.data));
    if (chartEntrate) chartEntrate.destroy();
    chartEntrate = renderGraficoTorta('grafico-entrate','legenda-entrate', trans, PALETTE_ENTRATE, chartEntrate, c=>{chartEntrate=c;});
    const cont = document.getElementById('lista-entrate');
    cont.innerHTML = trans.length===0
        ? '<div class="vuoto-stato"><div class="vuoto-icona">💰</div><p>Nessuna entrata nel periodo selezionato.</p></div>'
        : trans.map(renderTransazioneCard).join('');
}

function renderUscite() {
    const filtro = document.getElementById('filtro-mese-uscite')?.value || 'corrente';
    const trans = filtraPerPeriodo(stato.transazioni.filter(t=>t.tipo==='uscita'), filtro)
                  .sort((a,b)=>new Date(b.data)-new Date(a.data));
    if (chartUscite) chartUscite.destroy();
    chartUscite = renderGraficoTorta('grafico-uscite','legenda-uscite', trans, PALETTE_USCITE, chartUscite, c=>{chartUscite=c;});
    const cont = document.getElementById('lista-uscite');
    cont.innerHTML = trans.length===0
        ? '<div class="vuoto-stato"><div class="vuoto-icona">💸</div><p>Nessuna uscita nel periodo selezionato.</p></div>'
        : trans.map(renderTransazioneCard).join('');
}

function filtraPerPeriodo(trans, filtro) {
    const oggi = new Date();
    if (filtro === 'corrente')  return trans.filter(t => isInPeriodo(t.data, getPeriodoFiscale(oggi)));
    if (filtro === 'precedente') return trans.filter(t => isInPeriodo(t.data, getPeriodoFiscalePrecedente()));
    return trans;
}

// ========================
// GRAFICO TORTA
// ========================
function renderGraficoTorta(canvasId, legendaId, transazioni, palette, istanza, setIstanza) {
    const mappa = {};
    transazioni.forEach(t => { mappa[t.categoria] = (mappa[t.categoria]||0) + t.importo; });
    const labels = Object.keys(mappa);
    const valori = labels.map(k => mappa[k]);
    const colori = labels.map((_,i) => palette[i % palette.length]);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    if (istanza) { try { istanza.destroy(); } catch(e){} }

    if (labels.length === 0) {
        const wrap = canvas.parentElement;
        wrap.innerHTML = '<div class="vuoto-stato" style="height:160px;display:flex;align-items:center;justify-content:center;flex-direction:column;"><div style="font-size:36px;opacity:0.3;">📊</div><p style="font-size:12px;">Nessun dato</p></div>';
        const legEl = document.getElementById(legendaId);
        if (legEl) legEl.innerHTML = '';
        return null;
    }

    const nuova = new Chart(canvas, {
        type: 'doughnut',
        data: { labels, datasets: [{ data:valori, backgroundColor:colori, borderWidth:2, borderColor:'#fff' }] },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '62%',
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => ' ' + ctx.label + ': ' + formatImporto(ctx.parsed) } }
            }
        }
    });
    setIstanza(nuova);

    const tot = valori.reduce((s,v)=>s+v,0);
    const legEl = document.getElementById(legendaId);
    if (legEl) {
        legEl.innerHTML = labels.map((l,i) => {
            const pct = tot>0 ? ((valori[i]/tot)*100).toFixed(1) : 0;
            return `<div class="legenda-voce-custom">
                <div class="legenda-dot-custom" style="background:${colori[i]};"></div>
                <span>${l} · ${formatImporto(valori[i])} (${pct}%)</span>
            </div>`;
        }).join('');
    }
    return nuova;
}

// ========================
// SAVINGS — AUTOCOMPLETE ASSET
// ========================
function cercaNelDatabase(query) {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return DATABASE_ASSET.filter(a =>
        a.nome.toLowerCase().includes(q) ||
        a.ticker.toLowerCase().includes(q) ||
        a.tags.some(t => t.includes(q) || q.includes(t))
    ).slice(0, 6);
}

function onInputAsset() {
    const query = document.getElementById('sim-asset-query').value;
    const box = document.getElementById('sim-asset-suggerimenti');
    if (!box) return;

    if (!query.trim()) { box.style.display = 'none'; return; }

    const match = cercaNelDatabase(query);
    if (match.length === 0) { box.style.display = 'none'; return; }

    box.innerHTML = match.map(a => `
        <div class="suggerimento-asset" onmousedown="selezionaSuggerimento('${escAttr(a.nome)}')">
            <div class="suggerimento-nome">${escHTML(a.nome)}</div>
            <div class="suggerimento-meta">${escHTML(a.ticker)} · ~${a.rendimento}%/anno</div>
        </div>`).join('');
    box.style.display = 'block';
    suggerimentiAssetVisibili = true;
}

function nascondiSuggerimentiAsset() {
    setTimeout(() => {
        const box = document.getElementById('sim-asset-suggerimenti');
        if (box) box.style.display = 'none';
        suggerimentiAssetVisibili = false;
    }, 120);
}

function selezionaSuggerimento(nome) {
    document.getElementById('sim-asset-query').value = nome;
    const box = document.getElementById('sim-asset-suggerimenti');
    if (box) box.style.display = 'none';
    cercaAsset();
}

// ========================
// SAVINGS — CERCA ASSET
// ========================
async function cercaAsset() {
    const query = document.getElementById('sim-asset-query').value.trim();
    if (!query) { alert('Inserisci il nome o il ticker dell\'asset.'); return; }

    const risultato = document.getElementById('sim-asset-risultato');

    // 1. Prova prima nel database curato (istantaneo, nessuna chiamata di rete)
    const matchLocale = cercaNelDatabase(query).find(a =>
        a.nome.toLowerCase() === query.toLowerCase() ||
        a.tags.includes(query.toLowerCase())
    ) || cercaNelDatabase(query)[0];

    if (matchLocale) {
        assetTrovato = {
            nome: matchLocale.nome,
            ticker: matchLocale.ticker,
            rendimento_annuo_medio: matchLocale.rendimento,
            periodo_riferimento: matchLocale.periodo,
            note: matchLocale.note
        };
        document.getElementById('sim-rendimento').value = matchLocale.rendimento;
        document.getElementById('sim-rendimento-nota').textContent =
            `📊 ${matchLocale.nome} — media ${matchLocale.periodo}: ${matchLocale.rendimento}% annuo`;
        risultato.style.display = 'block';
        risultato.innerHTML = `<div class="sim-asset-trovato">
            <div>
                <div class="sim-asset-nome">${escHTML(matchLocale.nome)}</div>
                <div class="sim-asset-ticker">${escHTML(matchLocale.ticker)} · ${escHTML(matchLocale.note)}</div>
            </div>
            <div class="sim-asset-badge">📈 ${matchLocale.rendimento}% / anno<br><small style="font-weight:normal;font-size:10px;">${escHTML(matchLocale.periodo)}</small></div>
        </div>`;
        return;
    }

    // 2. Fallback: ricerca via Claude per asset non presenti nel database locale
    const btn = document.getElementById('btn-cerca-asset');
    btn.disabled = true;
    document.getElementById('cerca-asset-txt').innerHTML = '<div class="spinner"></div> Ricerca...';
    risultato.style.display = 'block';
    risultato.innerHTML = '<div class="sim-asset-loading"><div class="spinner" style="border-color:rgba(124,44,229,0.3);border-top-color:#7c2ce5;"></div> Asset non in elenco, ricerca estesa in corso...</div>';

    try {
        const risposta = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 300,
                system: `Sei un esperto finanziario. Quando ti viene chiesto di un asset (ETF, indice, materia prima, fondo, ecc.) rispondi SOLO con un oggetto JSON valido, senza spiegazioni né markdown. Il JSON deve avere esattamente questi campi:
{
  "trovato": true/false,
  "nome": "nome completo dell'asset",
  "ticker": "ticker ufficiale o sigla, es. VWCE.MI",
  "rendimento_annuo_medio": numero decimale (es. 9.8),
  "periodo_riferimento": "es. 2000-2024",
  "note": "breve nota in italiano su volatilità/rischio, max 80 char"
}
Se l'asset non è riconoscibile, metti trovato:false e gli altri campi null. Usa dati storici reali e aggiornati.`,
                messages: [{ role: 'user', content: `Asset: "${query}"` }]
            })
        });

        const data = await risposta.json();
        const testo = data.content?.find(b => b.type === 'text')?.text || '';

        let info;
        try {
            const pulito = testo.replace(/```json|```/g,'').trim();
            info = JSON.parse(pulito);
        } catch {
            throw new Error('Risposta non valida');
        }

        if (!info.trovato) {
            risultato.innerHTML = `<div class="sim-asset-errore">❌ Asset non riconosciuto. Prova con il ticker ufficiale (es. VWCE, SPY, QQQ) o un nome più preciso.</div>`;
            assetTrovato = null;
        } else {
            assetTrovato = info;
            document.getElementById('sim-rendimento').value = info.rendimento_annuo_medio;
            document.getElementById('sim-rendimento-nota').textContent =
                `📊 ${info.nome} — media ${info.periodo_riferimento}: ${info.rendimento_annuo_medio}% annuo`;

            risultato.innerHTML = `<div class="sim-asset-trovato">
                <div>
                    <div class="sim-asset-nome">${escHTML(info.nome)}</div>
                    <div class="sim-asset-ticker">${escHTML(info.ticker)} · ${escHTML(info.note)}</div>
                </div>
                <div class="sim-asset-badge">📈 ${info.rendimento_annuo_medio}% / anno<br><small style="font-weight:normal;font-size:10px;">${escHTML(info.periodo_riferimento)}</small></div>
            </div>`;
        }
    } catch(err) {
        risultato.innerHTML = `<div class="sim-asset-errore">⚠️ Impossibile recuperare i dati. Inserisci manualmente il rendimento atteso.</div>`;
        assetTrovato = null;
    }

    btn.disabled = false;
    document.getElementById('cerca-asset-txt').textContent = '🔍 Cerca';
}

function renderSavings() {
    document.getElementById('savings-capitale-display').textContent = formatImporto(stato.capitale);
    document.getElementById('capitale-valuta-prefix').textContent = stato.valuta;
    document.getElementById('sim-valuta-prefix').textContent = stato.valuta;
    document.getElementById('capitale-input').value = stato.capitale || '';
}

function calcolaSimulazione() {
    const capitaleIniziale = stato.capitale || 0;
    const contributo = parseFloat(document.getElementById('sim-contributo').value) || 0;
    const rendAnnuo  = parseFloat(document.getElementById('sim-rendimento').value) / 100;
    const anni       = parseInt(document.getElementById('sim-anni').value);
    const assetNome  = assetTrovato ? assetTrovato.nome : (document.getElementById('sim-asset-query').value || 'Asset personalizzato');

    if (isNaN(rendAnnuo) || rendAnnuo < 0) { alert('Inserisci un rendimento annuo valido.'); return; }

    const mesi = anni * 12;
    const r    = rendAnnuo / 12;
    const labelAnni = [], valoriTotale = [], valoriVersato = [];
    const step = mesi > 120 ? 6 : 1;

    for (let m = 0; m <= mesi; m += step) {
        const versato = capitaleIniziale + contributo * m;
        const valore  = r === 0 ? versato
            : capitaleIniziale * Math.pow(1+r,m) + contributo * (Math.pow(1+r,m)-1)/r;
        labelAnni.push((m/12).toFixed(1)+'a');
        valoriTotale.push(Math.round(valore));
        valoriVersato.push(Math.round(versato));
    }

    const vf = valoriTotale[valoriTotale.length-1];
    const cv = valoriVersato[valoriVersato.length-1];
    document.getElementById('sim-valore-finale').textContent     = formatImporto(vf);
    document.getElementById('sim-capitale-versato').textContent  = formatImporto(cv);
    document.getElementById('sim-rendimento-maturato').textContent = formatImporto(vf - cv);
    document.getElementById('sim-grafico-titolo').textContent    = `${escHTML(assetNome)} — proiezione ${anni} anni`;
    document.getElementById('risultato-simulazione').style.display = 'block';

    if (chartSavings) chartSavings.destroy();
    const isDark    = document.body.classList.contains('dark-mode');
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const tickColor = isDark ? '#888' : '#aaa';

    chartSavings = new Chart(document.getElementById('grafico-savings'), {
        type: 'line',
        data: {
            labels: labelAnni,
            datasets: [
                { label:'Valore stimato', data:valoriTotale, borderColor:'#7c2ce5',
                  backgroundColor:'rgba(124,44,229,0.12)', fill:true, tension:0.3, borderWidth:2, pointRadius:0 },
                { label:'Capitale versato', data:valoriVersato, borderColor:'#aaa',
                  backgroundColor:'transparent', borderDash:[5,5], tension:0.3, borderWidth:1.5, pointRadius:0 }
            ]
        },
        options: {
            responsive:true, maintainAspectRatio:false,
            interaction:{ mode:'index', intersect:false },
            plugins: {
                legend:{ display:true, labels:{ color:tickColor, font:{size:12} } },
                tooltip:{ callbacks:{ label: ctx => ' '+ctx.dataset.label+': '+formatImporto(ctx.parsed.y) } }
            },
            scales: {
                x:{ ticks:{ color:tickColor, maxTicksLimit:8 }, grid:{ color:gridColor } },
                y:{ ticks:{ color:tickColor, callback: v => stato.valuta+' '+v.toLocaleString('it-IT') }, grid:{ color:gridColor } }
            }
        }
    });
    setTimeout(() => document.getElementById('risultato-simulazione').scrollIntoView({ behavior:'smooth', block:'nearest' }), 100);
}

// ========================
// IMPOSTAZIONI
// ========================
function renderImpostazioni() {
    document.getElementById('imp-giorno-desc').textContent = 'Il tuo mese fiscale inizia il giorno ' + stato.giornoFiscale + ' di ogni mese.';
    document.getElementById('imp-valuta-desc').textContent = stato.valuta + ' (' + stato.valutaCodice + ')';
    renderListaCategorie();
}

function renderListaCategorie() {
    ['entrata','uscita'].forEach(tipo => {
        const contId = tipo==='entrata' ? 'lista-cat-entrate' : 'lista-cat-uscite';
        const cont = document.getElementById(contId);
        if (!cont) return;
        const custom = stato.categorieCustom[tipo] || [];
        const rinominate = {};
        custom.filter(c=>c.nomeOriginale).forEach(c=>{ rinominate[c.nomeOriginale]=c; });
        const nuove = custom.filter(c=>!c.nomeOriginale);

        let html = '';

        // Default (rinominabili ma non eliminabili)
        CATEGORIE_DEFAULT[tipo].forEach(nomeOrig => {
            const rec = rinominate[nomeOrig];
            const nome = rec ? rec.nome : nomeOrig;
            const id   = rec ? rec.id   : null;
            const emoji = EMOJI_CAT[nomeOrig] || '🔹';
            html += `<div class="categoria-voce" id="cat-row-${tipo}-${escAttr(nomeOrig)}">
                <span>${emoji} <span class="cat-nome-display">${escHTML(nome)}</span></span>
                <div class="cat-azioni">
                    <button class="btn-modifica-cat" onclick="iniziaModificaCat('${tipo}','${escAttr(nomeOrig)}','${escAttr(nome)}',true)" title="Rinomina">✏️</button>
                </div>
            </div>`;
        });

        // Personalizzate (rinominabili ed eliminabili)
        nuove.forEach(rec => {
            const emoji = EMOJI_CAT[rec.nome] || '🔹';
            html += `<div class="categoria-voce" id="cat-row-custom-${rec.id}">
                <span>${emoji} <span class="cat-nome-display">${escHTML(rec.nome)}</span></span>
                <div class="cat-azioni">
                    <button class="btn-modifica-cat" onclick="iniziaModificaCat('${tipo}',null,'${escAttr(rec.nome)}',false,'${rec.id}')" title="Rinomina">✏️</button>
                    <button class="btn-rimuovi-cat" onclick="rimuoviCategoriaCustom('${tipo}','${rec.id}')">✕</button>
                </div>
            </div>`;
        });

        cont.innerHTML = html;
    });
}

// Avvia modifica inline categoria
function iniziaModificaCat(tipo, nomeOrig, nomeAttuale, isDefault, idCustom) {
    const rowId = isDefault
        ? `cat-row-${tipo}-${nomeOrig}`
        : `cat-row-custom-${idCustom}`;
    const row = document.getElementById(rowId);
    if (!row) return;

    row.innerHTML = `<div class="cat-edit-row">
        <input type="text" value="${escHTML(nomeAttuale)}" id="cat-edit-input-${rowId}" maxlength="40">
        <button class="btn-cat-salva" onclick="salvaModificaCatInline('${tipo}','${escAttr(nomeOrig)}',${isDefault},'${idCustom||''}','${rowId}')">✓ Salva</button>
        <button class="btn-cat-annulla" onclick="renderListaCategorie()">✕</button>
    </div>`;
    document.getElementById(`cat-edit-input-${rowId}`)?.focus();
}

function salvaModificaCatInline(tipo, nomeOrig, isDefault, idCustom, rowId) {
    const input = document.getElementById(`cat-edit-input-${rowId}`);
    if (!input) return;
    const nuovoNome = input.value.trim();
    if (!nuovoNome) { alert('Inserisci un nome valido.'); return; }

    const custom = stato.categorieCustom[tipo] || [];

    if (isDefault) {
        // Rinomina default: cerca o crea record con nomeOriginale
        const idx = custom.findIndex(c => c.nomeOriginale === nomeOrig);
        if (nuovoNome === nomeOrig) {
            // Ripristinato al nome originale → rimuovi il record di rinomina
            if (idx >= 0) custom.splice(idx, 1);
        } else if (idx >= 0) {
            custom[idx].nome = nuovoNome;
        } else {
            custom.push({ id: genId(), nome: nuovoNome, nomeOriginale: nomeOrig });
        }
        // Aggiorna transazioni che usano il vecchio nome
        stato.transazioni.forEach(t => {
            if (t.tipo === tipo && (t.categoria === nomeOrig || t.categoria === custom.find(c=>c.nomeOriginale===nomeOrig)?.nome)) {
                t.categoria = nuovoNome;
            }
        });
    } else {
        // Rinomina personalizzata
        const rec = custom.find(c => c.id === idCustom);
        if (rec) {
            const vecchioNome = rec.nome;
            rec.nome = nuovoNome;
            stato.transazioni.forEach(t => { if (t.tipo===tipo && t.categoria===vecchioNome) t.categoria=nuovoNome; });
        }
    }

    stato.categorieCustom[tipo] = custom;
    salvaStato();
    renderListaCategorie();
}

function rimuoviCategoriaCustom(tipo, id) {
    const custom = stato.categorieCustom[tipo] || [];
    const rec = custom.find(c => c.id === id);
    if (!rec) return;

    const inUso = stato.transazioni.filter(t => t.tipo === tipo && t.categoria === rec.nome);
    const messaggio = inUso.length > 0
        ? `Rimuovere la categoria "${rec.nome}"?\n\n${inUso.length} transazione${inUso.length>1?'i':''} verranno spostate automaticamente su "Altro".`
        : `Rimuovere la categoria "${rec.nome}"?`;

    if (!confirm(messaggio)) return;

    if (inUso.length > 0) {
        stato.transazioni.forEach(t => {
            if (t.tipo === tipo && t.categoria === rec.nome) t.categoria = 'Altro';
        });
    }

    stato.categorieCustom[tipo] = custom.filter(c => c.id !== id);
    salvaStato();
    renderListaCategorie();
    aggiornaVistaAttiva();
}

function switchCatTab(tipo, btn) {
    document.querySelectorAll('.cat-tab').forEach(b=>b.classList.remove('attivo'));
    btn.classList.add('attivo');
    document.getElementById('cat-tab-entrate').style.display = tipo==='entrate' ? 'block' : 'none';
    document.getElementById('cat-tab-uscite').style.display  = tipo==='uscite'  ? 'block' : 'none';
}

function aggiungiCategoria(tipo) {
    const inputId = tipo==='entrata' ? 'nuova-cat-entrata' : 'nuova-cat-uscita';
    const input = document.getElementById(inputId);
    const nome = input.value.trim();
    if (!nome) return;
    const tutte = getCategorieEffettive(tipo);
    if (tutte.map(c=>c.toLowerCase()).includes(nome.toLowerCase())) { alert('Questa categoria esiste già.'); return; }
    if (!stato.categorieCustom[tipo]) stato.categorieCustom[tipo] = [];
    stato.categorieCustom[tipo].push({ id: genId(), nome, nomeOriginale: null });
    salvaStato();
    input.value = '';
    renderListaCategorie();
}

// ========================
// MODALE VOCE
// ========================
function apriModaleVoce(tipo) {
    modaleVoceTipo = tipo;
    document.getElementById('modale-voce-titolo').textContent = tipo==='entrata' ? '💰 Aggiungi entrata' : '💸 Aggiungi uscita';
    document.getElementById('voce-valuta-simbolo').textContent = stato.valuta;
    const cats = getCategorieEffettive(tipo==='entrata'?'entrata':'uscita');
    document.getElementById('voce-categoria').innerHTML =
        cats.map(c=>`<option value="${escAttr(c)}">${(EMOJI_CAT[c]||'🔹')} ${c}</option>`).join('');
    document.getElementById('voce-data').value = new Date().toISOString().split('T')[0];
    document.getElementById('voce-descrizione').value = '';
    document.getElementById('voce-importo').value = '';
    document.getElementById('voce-note').value = '';
    document.getElementById('modale-voce').style.display = 'flex';
    setTimeout(()=>document.getElementById('voce-descrizione').focus(), 100);
}
function chiudiModaleVoce() { document.getElementById('modale-voce').style.display = 'none'; }

function salvaVoce() {
    const desc    = document.getElementById('voce-descrizione').value.trim();
    const importo = parseFloat(document.getElementById('voce-importo').value);
    const cat     = document.getElementById('voce-categoria').value;
    const data    = document.getElementById('voce-data').value;
    const note    = document.getElementById('voce-note').value.trim();
    if (!desc)                    { alert('Inserisci una descrizione.'); return; }
    if (!importo || importo <= 0) { alert('Inserisci un importo valido.'); return; }
    if (!data)                    { alert('Inserisci una data.'); return; }
    stato.transazioni.push({ id:genId(), tipo:modaleVoceTipo, descrizione:desc,
        importo:Math.round(importo*100)/100, categoria:cat, data, note });
    salvaStato();
    chiudiModaleVoce();
    aggiornaVistaAttiva();
}

function eliminaTransazione(id) {
    if (!confirm('Eliminare questa transazione?')) return;
    stato.transazioni = stato.transazioni.filter(t=>t.id!==id);
    salvaStato();
    aggiornaVistaAttiva();
}

function aggiornaVistaAttiva() {
    const v = document.querySelector('.vista:not([style*="display: none"]):not([style*="display:none"])');
    if (!v) return;
    const id = v.id;
    if (id==='vista-dashboard')    renderDashboard();
    if (id==='vista-entrate')      renderEntrate();
    if (id==='vista-uscite')       renderUscite();
}

// ========================
// MODALE CAPITALE
// ========================
function apriModaleCapitale() {
    document.getElementById('capitale-input').value = stato.capitale || '';
    document.getElementById('capitale-valuta-prefix').textContent = stato.valuta;
    document.getElementById('modale-capitale').style.display = 'flex';
}
function chiudiModaleCapitale() { document.getElementById('modale-capitale').style.display = 'none'; }
function salvaCapitale() {
    const val = parseFloat(document.getElementById('capitale-input').value);
    if (isNaN(val)||val<0) { alert('Inserisci un valore valido.'); return; }
    stato.capitale = Math.round(val*100)/100;
    salvaStato();
    chiudiModaleCapitale();
    renderSavings();
    renderDashboard();
}

// ========================
// MODALE GIORNO / VALUTA
// ========================
function apriModaleSetupGiorno() {
    giornoImpTemp = stato.giornoFiscale;
    costruisciGrigliaGiorni('griglia-giorni-imp', giornoImpTemp, g=>{ giornoImpTemp=g; });
    document.getElementById('modale-giorno').style.display = 'flex';
}
function chiudiModaleGiorno() { document.getElementById('modale-giorno').style.display = 'none'; }
function salvaGiorno() {
    if (!giornoImpTemp) { alert('Seleziona un giorno.'); return; }
    stato.giornoFiscale = giornoImpTemp;
    salvaStato();
    chiudiModaleGiorno();
    renderImpostazioni();
    renderDashboard();
}

function apriModaleSetupValuta() {
    valutaImpTemp = { valuta:stato.valuta, codice:stato.valutaCodice };
    document.querySelectorAll('#modale-valuta .valuta-btn').forEach(b=>{
        b.classList.toggle('attivo', b.dataset.codice===stato.valutaCodice);
    });
    document.getElementById('modale-valuta').style.display = 'flex';
}
function chiudiModaleValuta() { document.getElementById('modale-valuta').style.display = 'none'; }
function selezionaValutaImp(btn) {
    document.querySelectorAll('#modale-valuta .valuta-btn').forEach(b=>b.classList.remove('attivo'));
    btn.classList.add('attivo');
    valutaImpTemp = { valuta:btn.dataset.valuta, codice:btn.dataset.codice };
}
function salvaValuta() {
    if (!valutaImpTemp) return;
    stato.valuta = valutaImpTemp.valuta;
    stato.valutaCodice = valutaImpTemp.codice;
    salvaStato();
    chiudiModaleValuta();
    aggiornaTuttoUI();
    renderImpostazioni();
}

function aggiornaTuttoUI() {
    document.querySelectorAll('.valuta-prefix').forEach(el=>{ el.textContent = stato.valuta; });
    const vp = document.getElementById('sim-valuta-prefix');
    if (vp) vp.textContent = stato.valuta;
    renderDashboard();
    renderImpostazioni();
}

// ========================
// BACKUP
// ========================
function esportaDati() {
    const blob = new Blob([JSON.stringify(stato,null,2)], { type:'application/json' });
    const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: `budget_backup_${new Date().toISOString().split('T')[0]}.json`
    });
    a.click(); URL.revokeObjectURL(a.href);
}
function importaDati(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const parsed = JSON.parse(e.target.result);
            if (!parsed.transazioni) throw new Error('File non valido');
            if (!confirm(`Importare ${parsed.transazioni.length} transazioni? I dati attuali verranno sostituiti.`)) return;
            stato = { ...stato, ...parsed };
            migrazioneCategorieExtra();
            salvaStato();
            aggiornaTuttoUI();
            alert('✅ Importazione completata!');
        } catch { alert('❌ File non valido o corrotto.'); }
    };
    reader.readAsText(file);
    input.value = '';
}
function cancellaTransazioni() {
    if (!confirm('Eliminare tutte le transazioni?')) return;
    stato.transazioni = [];
    salvaStato();
    aggiornaTuttoUI();
}
function resetCompleto() {
    if (!confirm('⚠️ Eliminare TUTTI i dati e ricominciare?')) return;
    if (!confirm('Sei sicuro? Azione irreversibile.')) return;
    localStorage.removeItem('budget_stato');
    location.reload();
}

// ========================
// UTILITY HTML
// ========================
function escHTML(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s) {
    return String(s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');
}

// Chiudi modali cliccando overlay
document.addEventListener('click', e => {
    ['modale-voce','modale-capitale','modale-giorno','modale-valuta'].forEach(id => {
        const el = document.getElementById(id);
        if (el && e.target === el) el.style.display = 'none';
    });
});
