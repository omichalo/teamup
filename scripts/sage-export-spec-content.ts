export type SpecBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "note"; text: string };

export const SPEC_COVER_SUBTITLE =
  "Guide pour la secrétaire du club :\nexporter depuis TeamUp et importer dans Sage";

export const SPEC_DATE_LABEL = "4 octobre 2026";

export const SPEC_COVER_NOTE =
  "Les numéros de comptes sont une proposition. Avant le premier import, rapprochez-les du plan réellement ouvert dans le dossier Sage du club. Faites un essai sur une copie du dossier, pas sur la comptabilité définitive.";

export const specSections: Array<{ title: string; blocks: SpecBlock[] }> = [
  {
    title: "1. À qui s'adresse ce document",
    blocks: [
      {
        type: "p",
        text: "Ce guide est écrit pour la secrétaire du club, qui tient Sage et qui génère l'export depuis TeamUp. Il décrit ce que TeamUp produit, comment l'obtenir dans l'application, comment l'importer, et ce que Sage doit encore faire ensuite (banque, commissions, reversement FFTT).",
      },
      {
        type: "p",
        text: "L'export contient des écritures équilibrées. Une pièce TeamUp (facture, avoir, encaissement, aide) devient une écriture Sage. C'est une comptabilité d'engagement : la facture constate la créance de l'adhérent ; l'encaissement et l'aide reçue la soldent.",
      },
    ],
  },
  {
    title: "2. Exporter depuis TeamUp",
    blocks: [
      {
        type: "p",
        text: "Connectez-vous avec un compte administration ou secrétariat. Dans le menu Adhésions, ouvrez « Export comptable » (adresse /club/export-comptable).",
      },
      {
        type: "ul",
        items: [
          "Vérifiez la saison (préremplie avec la campagne active). L'export ne contient que les dossiers de cette saison.",
          "Cliquez sur « Générer l'export ». Un fichier ZIP se télécharge.",
          "La page affiche un résumé : nombre de pièces, totaux débit et crédit, équilibre, tiers provisoires, codes d'anomalies. Les noms d'adhérents ne s'affichent pas à l'écran : ils sont dans le ZIP.",
          "Le plan de comptes proposé est listé plus bas sur la même page, à rapprocher de Sage avant import.",
        ],
      },
      {
        type: "note",
        text: "L'export relit les dossiers d'adhésion sans les modifier. Vous pouvez le relancer autant de fois que nécessaire. En revanche, n'importez pas deux fois le même fichier dans Sage (voir section 5).",
      },
    ],
  },
  {
    title: "3. Contenu du ZIP",
    blocks: [
      {
        type: "table",
        headers: ["Fichier", "Usage"],
        rows: [
          ["XIMPORT.TXT", "Format Sage 50 / Ciel (largeur fixe) — import natif"],
          ["ecritures-sage.csv", "CSV TeamUp (8 colonnes) — import paramétrable"],
          ["ecritures-sage-detail.csv", "Même journal + n° TeamUp, dossier, nom"],
          ["tiers.csv", "Comptes auxiliaires 411 (création / mise à jour)"],
          ["anomalies.csv", "Points à traiter avant ou après import"],
          ["controle.json", "Totaux, sans liste nominative"],
          ["LISEZMOI.txt", "Rappel des fichiers"],
          ["export-comptable-sage.pdf", "Ce guide (s'il est présent dans le pack)"],
        ],
      },
      {
        type: "p",
        text: "Importez un seul des deux fichiers d'écritures (XIMPORT.TXT ou ecritures-sage.csv), jamais les deux : ce sont les mêmes mouvements. Le CSV est en UTF-8 avec BOM, séparateur point-virgule : Journal, Date, Piece, CompteGeneral, CompteAuxiliaire, Libelle, Debit, Credit. XIMPORT.TXT est en largeur fixe (ANSI), montant + sens D/C ; sur les lignes clients, le champ compte porte l'auxiliaire TeamUp (A…). Libellé XImport limité à 25 caractères ; le détail complet reste dans le CSV.",
      },
      {
        type: "note",
        text: "Sur Sage 50 Essentials Simply, préférez d'abord XIMPORT.TXT (Échanges → Importer des écritures, format Sage/Ciel). Le CSV reste utile pour contrôler dans Excel ou via un import paramétrable.",
      },
    ],
  },
  {
    title: "4. Importer dans Sage",
    blocks: [
      {
        type: "p",
        text: "Les menus exacts dépendent de votre version Sage. La logique est toujours la même. Aucune capture d'écran n'est jointe, pour éviter un mode opératoire qui ne correspondrait pas à votre écran.",
      },
      {
        type: "ul",
        items: [
          "1. Copie de travail — ouvrez une copie du dossier Sage, ou un exercice de simulation. Ne faites pas le premier essai sur la comptabilité définitive.",
          "2. Plan — créez s'ils manquent les journaux VE, BQ, CA, OD (2 caractères) et les comptes de la section 6. Le 411000 doit être un collectif clients avec auxiliaires.",
          "3. Tiers — créez ou mettez à jour les auxiliaires (tiers.csv). Le code (A…) est stable ; la licence FFTT est une info de fiche, pas la clé.",
          "4a. Voie rapide — importez XIMPORT.TXT via Échanges → Importer des écritures (format Sage / Ciel / XImport).",
          "4b. Voie CSV — créez un import paramétrable (Dossier → Options → Imports paramétrables), mappez les 8 colonnes, puis importez ecritures-sage.csv.",
          "5. Contrôle — vérifiez l'équilibre avec controle.json, puis un adhérent de bout en bout (facture, CB ou SumUp, avoir ou Pass Sport).",
        ],
      },
      {
        type: "p",
        text: "Quand l'essai est bon, répétez l'import sur le dossier réel, une seule fois pour cette saison (ou après avoir extourné l'import précédent).",
      },
    ],
  },
  {
    title: "5. Ne pas importer deux fois",
    blocks: [
      {
        type: "p",
        text: "Chaque génération est un journal complet de la saison, pas un « depuis la dernière fois ». Relancer l'export dans TeamUp est sans danger. Réimporter le CSV dans Sage sans avoir annulé le précédent crée des doublons (factures et encaissements en double).",
      },
      {
        type: "ul",
        items: [
          "Une pièce déjà importée ne se corrige pas en réimportant une ligne modifiée.",
          "Une correction ultérieure dans TeamUp (avoir, complément, annulation d'encaissement) produit une nouvelle pièce (AVO, FAC complémentaire, contrepassation XREC). Ces nouvelles pièces n'apparaissent dans Sage que si vous importez un nouveau fichier — donc uniquement après avoir défini une règle claire (nouvel import intégral après extourne, ou import manuel des seules nouvelles pièces).",
          "Notez la date et le nom du ZIP importé (dans Sage ou dans un classeur) pour savoir ce qui est déjà passé.",
        ],
      },
    ],
  },
  {
    title: "6. Journaux et plan de comptes",
    blocks: [
      {
        type: "p",
        text: "Quatre journaux de 2 caractères (compatibles XImport Sage 50). Comptes sur six chiffres. Collectif clients 411000 ; l'auxiliaire (code tiers) n'est obligatoire que sur ce compte.",
      },
      {
        type: "table",
        headers: ["Journal", "Usage"],
        rows: [
          ["VE", "Factures, compléments, avoirs"],
          ["BQ", "Carte Stripe, SumUp, virement, chèque, chèques vacances, autre"],
          ["CA", "Espèces"],
          ["OD", "Aides reçues (Pass Sport, Labaz…)"],
        ],
      },
      {
        type: "table",
        headers: ["Compte", "Intitulé", "Sens habituel"],
        rows: [
          ["411000", "Clients adhérents", "Débit à la facture"],
          ["756000", "Cotisations", "Crédit à la facture"],
          ["754000", "Dons", "Crédit à la facture"],
          ["467100", "FFTT — licences à reverser", "Crédit à la facture"],
          ["467200", "Pass Sport à recevoir", "Débit à l'aide reçue"],
          ["467210", "Pass Plus à recevoir", "Débit à l'aide reçue"],
          ["467220", "Labaz à recevoir", "Débit à l'aide reçue"],
          ["467230", "Aide municipale à recevoir", "Débit à l'aide reçue"],
          ["467290", "Autres aides à recevoir", "Type d'aide inconnu"],
          ["511200", "Stripe à rapprocher", "Débit à l'encaissement CB"],
          ["511210", "SumUp à rapprocher", "Débit au TPE SumUp"],
          ["512000", "Banque — virements", "Débit au virement adhérent"],
          ["511300", "Chèques à encaisser", "Débit à la réception du chèque"],
          ["511400", "Chèques vacances à l'encaissement", "Débit à la réception"],
          ["511900", "Attente — autres règlements", "Moyen non classé"],
          ["531000", "Caisse", "Débit des espèces"],
        ],
      },
      {
        type: "note",
        text: "754000 (dons) et la série 467 / 511 sont à confirmer sur votre plan. Si les dons sont en 758, seul le numéro change. Pas de TVA : cotisations d'une association sportive à ses membres, exonérées (CGI art. 261-7). Les montants TeamUp passent tels quels (TTC = HT).",
      },
    ],
  },
  {
    title: "7. Identifiant adhérent (tiers Sage)",
    blocks: [
      {
        type: "p",
        text: "Le code auxiliaire du 411000 est un identifiant TeamUp opaque, figé à la première facture. Il ne change pas quand la licence FFTT arrive plus tard. C'est ce code, pas le numéro de licence, qui porte le lettrage d'une saison à l'autre.",
      },
      {
        type: "ul",
        items: [
          "Forme courante : A suivi d'une séquence (exemple A000042). Attribué une fois pour la personne.",
          "La licence FFTT est un attribut de la fiche tiers (colonne Licence de tiers.csv), jamais la clé des écritures.",
          "Sans licence sur le dossier : le code reste valide ; anomalies.csv peut signaler licence_absente (suivi secrétariat), sans fusion à faire dans Sage.",
          "À la réinscription, si la licence est déjà connue, TeamUp réutilise le même code auxiliaire.",
        ],
      },
      {
        type: "p",
        text: "Longueur bien sous le plafond usuel de 17 du code tiers Sage. controle.json signale un code porté par deux noms différents.",
      },
    ],
  },
  {
    title: "8. Numéro de pièce",
    blocks: [
      {
        type: "p",
        text: "Le numéro TeamUp (exemple FAC-2026-2027-00009) fait 19 caractères. Sage limite souvent la pièce à 17. L'export le compacte : FAC262700009 (préfixe, deux années sur deux chiffres, séquence sur cinq). Le numéro complet reste dans ecritures-sage-detail.csv, colonne NumeroTeamUp.",
      },
      {
        type: "p",
        text: "Une annulation d'encaissement reprend la même logique avec un X devant : XREC262700013. Les deux pièces restent sous 17 caractères.",
      },
    ],
  },
  {
    title: "9. Facture — ventilation",
    blocks: [
      {
        type: "p",
        text: "Chaque facture (FAC) est une écriture du journal VE. Débit du 411000 (auxiliaire de l'adhérent) = total de la pièce. Le crédit est ventilé par nature : cotisation, licence FFTT, don. Les libellés tarifaires (Classique, École de ping, CHAMP'YON, compétition, maillot, réduction famille, première inscription féminine) restent en cotisations (756000). Les réductions diminuent ce compte.",
      },
      {
        type: "table",
        headers: ["Nature", "Compte"],
        rows: [
          ["Cotisation, compétitions, maillot, réductions catalogue", "756000"],
          ["Licence FFTT", "467100"],
          ["Don volontaire", "754000"],
          ["Remise de 25 % liée au don (plafond 73 €)", "Diminue le 756000"],
        ],
      },
      {
        type: "p",
        text: "Exemple. Cotisation 175 €, réduction famille 20 €, maillot 15 €, licence 45 €, don 100 €, remise don 25 €. Total facture 290 €.",
      },
      {
        type: "table",
        headers: ["Compte", "Débit", "Crédit"],
        rows: [
          ["411000 C078101965", "290,00", ""],
          ["756000 Cotisations", "", "145,00"],
          ["467100 Licence FFTT", "", "45,00"],
          ["754000 Don", "", "100,00"],
        ],
      },
      {
        type: "p",
        text: "Les 145 € de cotisation sont 175 − 20 + 15 − 25. La licence est un compte de transit : le club l'encaisse pour la FFTT. Le reversement à la fédération se saisit plus tard dans Sage (débit 467100, crédit banque), d'après le paiement réel. Il n'est pas dans cet export.",
      },
      {
        type: "note",
        text: "Maillot et compétitions restent en cotisations. Un compte 707 n'est utile que si vous voulez isoler la revente textile. Pass Sport et Labaz ne sont pas des lignes de facture : ils ne diminuent pas le 756000 ; ils soldent le 411 via une pièce d'aide.",
      },
    ],
  },
  {
    title: "10. Complément et avoir",
    blocks: [
      {
        type: "p",
        text: "Si le tarif du dossier augmente après engagement, TeamUp émet une facture complémentaire (FAC). S'il baisse, ou si une remise exceptionnelle est saisie, TeamUp émet un avoir (AVO). Ces ajustements sont une ligne « ajustement tarifaire », imputée au 756000.",
      },
      {
        type: "ul",
        items: [
          "Complément de 30 € : débit 411000 30 €, crédit 756000 30 €.",
          "Avoir de 10 € : débit 756000 10 €, crédit 411000 10 €, même auxiliaire.",
        ],
      },
      {
        type: "p",
        text: "Un changement qui ne porterait que sur la licence après coup part donc aussi au 756000. Le suivi fin du 467100 repose surtout sur la facture initiale, où la ligne Licence est identifiable.",
      },
    ],
  },
  {
    title: "11. Encaissements",
    blocks: [
      {
        type: "p",
        text: "Chaque reçu (REC) est une écriture séparée. Crédit du 411000, même auxiliaire que la facture (lettrage). Débit selon le moyen, à la date de réception au club, pas à la date de valeur bancaire.",
      },
      {
        type: "table",
        headers: ["Moyen dans TeamUp", "Journal", "Débit"],
        rows: [
          ["Carte (Stripe)", "BQ", "511200 Stripe à rapprocher"],
          ["SumUp (TPE)", "BQ", "511210 SumUp à rapprocher"],
          ["Virement", "BQ", "512000 Banque"],
          ["Chèque", "BQ", "511300 Chèques à encaisser"],
          ["Chèques vacances", "BQ", "511400"],
          ["Espèces", "CA", "531000 Caisse"],
          ["Autre (non classé)", "BQ", "511900 Attente"],
        ],
      },
      {
        type: "p",
        text: "Stripe et SumUp ne vont pas directement au compte banque définitif : TeamUp sait que l'adhérent a payé, pas quand le prestataire vire ni quelle commission il prélève. Dans Sage, plus tard : débit banque 512, débit 627 commissions, crédit 511200 ou 511210. Le virement adhérent part déjà au 512000. Le chèque quitte le 511300 à la remise en banque. Les espèces quittent la caisse au dépôt. Ces écritures de trésorerie réelle ne sont pas dans l'export.",
      },
      {
        type: "p",
        text: "Un encaissement annulé dans TeamUp est exporté deux fois : le REC d'origine, puis une contrepassation de même montant, datée de l'annulation, numéro préfixé par X. Le net sur le 411 et sur le compte de trésorerie est nul.",
      },
    ],
  },
  {
    title: "12. Aides",
    blocks: [
      {
        type: "p",
        text: "Une aide collectée (Pass Sport, Pass Plus, Labaz, aide municipale) réellement reçue au secrétariat, avec numéro AID, est une écriture d'OD. Elle solde une partie de la créance adhérent. L'organisme devient le débiteur.",
      },
      {
        type: "ul",
        items: [
          "Débit du 467 de l'organisme, crédit du 411000 du même adhérent.",
          "Quand l'organisme paie le club : débit 512, crédit du 467. Cette écriture se saisit dans Sage au vu du relevé, elle n'est pas dans TeamUp.",
          "Une aide seulement déclarée, pas encore reçue, ne génère pas d'écriture. Elle apparaît dans anomalies.csv (aide_non_recue).",
        ],
      },
    ],
  },
  {
    title: "13. Remise exceptionnelle",
    blocks: [
      {
        type: "p",
        text: "La remise exceptionnelle saisie au secrétariat diminue le montant facturé. TeamUp émet un avoir (AVO) : débit 756000, crédit 411000. Cet avoir est dans ecritures-sage.csv comme les autres AVO. Il n'y a rien à passer « à part » dans Sage pour une remise correctement saisie.",
      },
      {
        type: "ul",
        items: [
          "Ne jamais enregistrer une remise comme un encaissement « autre » : TeamUp refuse les libellés du type remise / trop-perçu / réduction sur un règlement.",
          "Les aides Pass Sport / Labaz soldent le 411 via AID ; ce ne sont pas des remises.",
        ],
      },
    ],
  },
  {
    title: "14. Dates, libellés, lettrage",
    blocks: [
      {
        type: "ul",
        items: [
          "Dates en JJ/MM/AAAA, fuseau Europe/Paris. Une heure tardive en UTC peut tomber le lendemain à Paris.",
          "Devise EUR. Montants avec virgule, sans symbole. La colonne vide est le sens opposé.",
          "Libellé tronqué à 69 caractères : « Prénom NOM — nature saison ».",
          "Lettrage : même auxiliaire 411 sur facture, encaissements, aides et avoirs. Le solde ouvert du tiers = facturé − encaissé − aides reçues − avoirs. Il doit coller au solde TeamUp.",
        ],
      },
    ],
  },
  {
    title: "15. Contrôles avant import",
    blocks: [
      {
        type: "ul",
        items: [
          "controle.json : balanced = oui, unbalancedPieces vide, total débit = total crédit.",
          "Lire anomalies.csv : aides non reçues (normales tant que le dossier n'est pas soldé par l'organisme), licences absentes sur la fiche (licence_absente), éventuellement d'autres codes.",
          "Une licence manquante n'empêche pas l'import : le code auxiliaire est déjà figé.",
          "Importer d'abord sur une copie, et contrôler un adhérent de bout en bout.",
        ],
      },
    ],
  },
  {
    title: "16. Hors de cet export",
    blocks: [
      {
        type: "ul",
        items: [
          "Virement Stripe / SumUp vers la banque du club, et commissions.",
          "Remise de chèques et dépôt d'espèces.",
          "Reversement des licences à la FFTT.",
          "Encaissement ultérieur des aides par l'organisme payeur.",
          "Rapprochement bancaire et lettrage définitif, dans Sage.",
          "Charges, immobilisations, paie : TeamUp ne les porte pas.",
        ],
      },
      {
        type: "p",
        text: "Document mis à jour le 4 octobre 2026. Il reste un projet d'import tant que le plan Sage du club n'a pas été rapproché des numéros proposés ici.",
      },
    ],
  },
];
