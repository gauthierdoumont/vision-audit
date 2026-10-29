// Provisions et parties liées. Audit Detective — créé par Gauthier Doumont.
import { REF } from '../ids';
import { between, sortEntries } from '../ledger';
import { addDays, euros, formatAmount, formatDate, isoDate, roundTo } from '../money';
import { c, claim, d, deductibleVat, everywhere, purchaseEntries, salesTotal, totalsOf, type AnomalyDefinition } from './types';

/** Un procès en cours, connu de la gérance, sans provision au bilan. */
export const unrecordedProvision: AnomalyDefinition = {
  type: 'unrecorded-provision',
  appliesTo: () => true,
  inject: (ctx) => {
    const { truth, rng, company } = ctx;
    const year = company.fiscalYear;
    const claimant = rng.pick(['un ancien client', 'un ancien salarié', 'un voisin du dépôt']);
    const reason = claimant === 'un ancien salarié' ? 'un licenciement jugé abusif' : 'un dommage causé lors d’une livraison';
    const claimed = between(rng, [18_000, 40_000], 500);
    const likely = roundTo(Math.round((claimed * rng.int(60, 80)) / 100), euros(500));
    const letterDate = isoDate(year, 11, rng.int(5, 25));
    everywhere(ctx, (b) => {
      b.world.letters.push({
        id: 'avocat',
        from: 'Maître Collard, avocate de la société',
        subject: 'Procédure en cours',
        lines: [
          { id: 'l1', text: `Le ${formatDate(letterDate, true)} : ${claimant} vous réclame ${formatAmount(claimed)} € pour ${reason}.` },
          { id: 'l2', text: `À mon avis, une condamnation est probable. Montant à prévoir : environ ${formatAmount(likely)} €.` },
          { id: 'l3', text: 'L’audience est fixée au printemps prochain.' },
        ],
      });
      b.world.minutes.push({ id: 'm-litige', date: isoDate(year, 12, rng.int(2, 15)), meeting: 'Organe d’administration', text: `Litige avec ${claimant} : on attend le jugement avant de prendre une décision.` });
    });
    truth.entries.push({ id: ctx.newId('e'), journal: 'OD', date: isoDate(year, 12, 31), label: 'Provision pour litige', lines: [d('637', likely), c('164', likely)] });
    sortEntries(truth.entries);
    return {
      type: 'unrecorded-provision',
      cycle: 'provisions',
      assertion: 'exhaustivite',
      qualification: 'fraude',
      actor: 'manager',
      accounts: [{ account: '164', amount: likely }, { account: '637', amount: likely }],
      correction: [d('637', likely), c('164', likely)],
      traces: [REF.legal('avocat-l2'), REF.minutes('m-litige'), REF.confession()],
      contradictedBy: [REF.legal('avocat-l1'), REF.legal('avocat-l2'), REF.minutes('m-litige')],
      params: { claimant, reason, claimed: formatAmount(claimed), likely: formatAmount(likely) },
    };
  },
};

/** Le principal fournisseur est dirigé par le gérant ; prix hors marché ; rien dans l'annexe. */
export const relatedPartyUndisclosed: AnomalyDefinition = {
  type: 'related-party-undisclosed',
  appliesTo: () => true,
  inject: (ctx) => {
    const { books, company, rng } = ctx;
    const year = company.fiscalYear;
    const candidates = books.parties.filter((p) => p.kind === 'supplier' && p.registryId && purchaseEntries(books, (_e, i) => i.partyId === p.id && i.account === '604').length > 3);
    const supplier = claim(ctx, candidates, (p) => p.id);
    const manager = `${company.manager.firstName} ${company.manager.lastName}`;
    const volume = books.invoices.filter((i) => i.partyId === supplier.id && i.flow === 'purchase').reduce((s, i) => s + (i.kind === 'credit-note' ? -1 : 1) * totalsOf(i).base, 0);
    everywhere(ctx, (b) => {
      const entry = b.world.registry.find((r) => r.id === supplier.registryId)!;
      entry.directors = [manager];
      b.world.contracts.push({
        id: 'cadre',
        title: `Contrat-cadre ${supplier.name}`,
        partyId: supplier.id,
        clauses: [
          `Signé pour les deux parties par ${manager}.`,
          `Prix convenus : environ ${rng.int(25, 35)} % au-dessus du tarif public du fournisseur.`,
          `Volume facturé en ${year} : ${formatAmount(volume)} € HTVA.`,
        ],
      });
    });
    return {
      type: 'related-party-undisclosed',
      cycle: 'parties liées',
      assertion: 'presentation',
      qualification: 'fraude',
      supplierId: supplier.id,
      actor: 'manager',
      accounts: [{ account: '604', amount: volume }],
      correction: [],
      disclosureOnly: true,
      traces: [REF.registry(supplier.registryId!), REF.contract('cadre'), { doc: 'contrats', line: 'k-cadre-2' }, REF.confession()],
      contradictedBy: [REF.registry(supplier.registryId!), REF.contract('cadre')],
      params: { supplier: supplier.name, manager, volume: formatAmount(volume), year: String(year) },
    };
  },
};

/** Contrôle TVA clôturé en décembre : régularisation et amende acceptées, mais rien au bilan (« on paie en janvier »). */
export const unrecordedTaxDebt: AnomalyDefinition = {
  type: 'unrecorded-tax-debt',
  appliesTo: deductibleVat,
  inject: (ctx) => {
    const { books, truth, rng, company } = ctx;
    const year = company.fiscalYear;
    const vat = roundTo(Math.round((salesTotal(books) * rng.int(5, 10)) / 1000), euros(1));
    // Amende fixée par l'administration selon la gravité (barème À VÉRIFIER) : ici environ 10 %.
    const fine = roundTo(Math.round(vat / 10), euros(10));
    const total = vat + fine;
    const agreed = isoDate(year, 12, rng.int(3, 12));
    const manager = `${company.manager.firstName} ${company.manager.lastName}`;
    const payment = { id: ctx.newId('ev'), date: isoDate(year + 1, 1, rng.int(20, 30)), label: 'SPF Finances — régularisation TVA et amende (contrôle de décembre)', amount: -total };
    everywhere(ctx, (b) => {
      b.world.letters.push({
        id: 'spf',
        from: 'SPF Finances, administration de la TVA',
        subject: 'Contrôle TVA',
        lines: [
          { id: 'l1', text: 'Contrôle : la TVA sur les frais des voitures de société a été déduite à 100 %. La déduction est limitée à l’usage professionnel, au maximum 50 %.' },
          { id: 'l2', text: `Régularisation : ${formatAmount(vat)} € de TVA à reverser et ${formatAmount(fine)} € d’amende administrative.` },
          { id: 'l3', text: `Accord signé par ${manager} le ${formatDate(agreed, true)}. Montant à payer au plus tard le 31/01/${year + 1}.` },
        ],
      });
      b.world.minutes.push({ id: 'm-tva', date: addDays(agreed, 2), meeting: 'Organe d’administration', text: 'Contrôle TVA clôturé : la gérance a signé l’accord de régularisation, paiement prévu en janvier.' });
      b.world.afterClosing.push({ ...payment });
    });
    // La dette existe dès l'accord de décembre, même si elle se paie en janvier.
    truth.entries.push({ id: ctx.newId('e'), journal: 'OD', date: agreed, label: 'Régularisation TVA après contrôle', lines: [d('640', total), c('451', vat), c('452', fine)] });
    sortEntries(truth.entries);
    return {
      type: 'unrecorded-tax-debt',
      cycle: 'provisions',
      assertion: 'exhaustivite',
      qualification: 'erreur',
      actor: 'manager',
      accounts: [{ account: '640', amount: total }, { account: '451', amount: vat }, { account: '452', amount: fine }],
      correction: [d('640', total), c('451', vat), c('452', fine)],
      traces: [REF.legal('spf-l2'), REF.legal('spf-l3'), REF.minutes('m-tva'), REF.afterClosing(payment.id), REF.topic()],
      params: { vat: formatAmount(vat), fine: formatAmount(fine), total: formatAmount(total), date: formatDate(agreed, true), manager, year: String(year) },
    };
  },
};

export const PROVISION_ANOMALIES = [unrecordedProvision, relatedPartyUndisclosed, unrecordedTaxDebt];
