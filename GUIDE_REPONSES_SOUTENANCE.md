# 🎓 Guide de Réponses pour la Soutenance (FAQ)
## Projet : CERIST Biblio-Platform V2

Ce document est conçu pour vous aider à répondre aux questions de votre encadrante ou du jury. Gardez-le ouvert pendant vos discussions.

---

### 1. QUESTIONS SUR LES TECHNOLOGIES 🛠️

**Q : Pourquoi avoir utilisé FastAPI (Python) au lieu de Node.js ou PHP ?**
*   **Réponse :** FastAPI est l'un des frameworks les plus performants au monde. Il est asynchrone, ce qui est parfait pour gérer les appels aux APIs de recherche (OpenAlex/PubMed). De plus, Python est le langage standard pour la science des données et la bibliométrie (utilisé pour les calculs d'index).

**Q : Pourquoi React 19 pour le frontend ?**
*   **Réponse :** React permet de créer une interface "Single Page Application" (SPA) ultra-réactive. L'interface ne se recharge pas à chaque clic, ce qui donne une impression de fluidité professionnelle. La version 19 est la plus moderne, offrant de meilleures performances de rendu.

**Q : Pourquoi avoir choisi Recharts pour les graphiques ?**
*   **Réponse :** C'est une bibliothèque native React qui génère du SVG. Cela permet une intégration parfaite avec notre design (mode sombre, réactivité) et des exports PDF de haute qualité.

**Q : (La question piège) Pourquoi ne pas avoir utilisé VOSviewer ?**
*   **Réponse :** VOSviewer est un logiciel externe. Nous voulions une solution **100% intégrée** où le chercheur n'a rien à installer. Nous avons réimplémenté la logique de VOSviewer (centralité/densité) directement dans notre dashboard avec Recharts pour que tout soit automatisé et temps réel.

---

### 2. QUESTIONS SUR LES DONNÉES ET LES CALCULS 📊

**Q : D'où viennent les publications ? Est-ce une base de données locale ?**
*   **Réponse :** Les données sont récupérées en temps réel via les APIs mondiales **OpenAlex** (données généralistes) et **PubMed** (données médicales). Nous stockons uniquement les métadonnées nécessaires dans notre base PostgreSQL pour permettre les calculs de statistiques et l'historique.

**Q : Comment gérez-vous les doublons si deux chercheurs d'une même équipe publient ensemble ?**
*   **Réponse :** C'est un point clé de notre algorithme. Avant de calculer les statistiques de groupe (Labo ou Équipe), nous effectuons une **déduplication par ID OpenAlex**. Si deux auteurs de la même équipe ont le même article, celui-ci n'est compté qu'une seule fois dans le H-index de groupe.

**Q : Comment est calculé le H-index ?**
*   **Réponse :** Le système trie les publications par nombre de citations. Le H-index est le nombre 'H' tel que l'auteur possède au moins 'H' articles cités au moins 'H' fois. Nous calculons aussi le **G-index** et l'**i10-index** pour une analyse plus complète.

---

### 3. QUESTIONS SUR LA SÉCURITÉ ET LA HIÉRARCHIE 🔐

**Q : Comment garantissez-vous que les données d'un laboratoire ne soient pas vues par un autre ?**
*   **Réponse :** Nous utilisons un système de **RBAC (Role-Based Access Control)**. Chaque requête API est protégée par un **Token JWT**. Le Backend vérifie systématiquement l'appartenance de l'utilisateur à son institution/laboratoire avant de renvoyer la moindre donnée (Isolation des données).

**Q : C'est quoi le "Soft Delete" dans votre code ?**
*   **Réponse :** C'est une sécurité. Lorsqu'on supprime un membre ou une équipe, on ne l'efface pas physiquement de la base (pour ne pas perdre l'historique de recherche de l'université). On le marque simplement comme "inactif".

---

### 4. QUESTIONS SUR LE FUTUR ET LES AMÉLIORATIONS 🚀

**Q : Quelles sont les limites actuelles de votre projet ?**
*   **Réponse :** Actuellement, la synchronisation dépend de la vitesse de réponse des APIs externes (OpenAlex). Une amélioration future serait de mettre en place un système de cache (Redis) plus agressif ou d'ajouter une analyse de sentiments sur les citations (Citations positives vs négatives).

**Q : Est-ce que le système peut gérer des milliers de chercheurs ?**
*   **Réponse :** Oui, l'architecture FastAPI + PostgreSQL est conçue pour passer à l'échelle (Scalability). Le système d'authentification JWT est apatride (stateless), ce qui permet de supporter une montée en charge importante.

---

### 💡 ASTUCES POUR RÉPONDRE :
*   Si vous ne savez pas : Ne dites pas "Je ne sais pas". Dites : *"C'est un aspect technique intéressant, l'implémentation actuelle repose sur [X], mais nous avons prévu d'approfondir ce point dans la phase d'optimisation."*
*   Utilisez des mots clés : "Asynchrone", "Déduplication", "JWT", "Relations ORM", "API REST".
