1. [[Úvod do Big Data a NoSQL databází]]

-  **[[Úvod do Big Data a NoSQL databází#Big Data|Big Data]]:** koncept, 5V charakteristiky (volume, variety, velocity, veracity, value), současné trendy a výzvy.
- **[[Úvod do Big Data a NoSQL databází#Relační databáze|Relační databáze]]:** funkční závislosti, normální formy, transakce, ACID vlastnosti.
- **[[Úvod do Big Data a NoSQL databází#NoSQL databáze|NoSQL databáze]]:** motivace, typy NoSQL systémů (key-value, wide column, document, graph), společné vlastnosti (agregáty, schemalessness, flexibilita, automatická údržba).
- **[[Úvod do Big Data a NoSQL databází#Návrh databází|Návrh databází]]:** "query-driven" modelování (návrh řízený přístupovými vzory), polyglot persistence.

**2. [[Formáty dat]]**

- **XML:** konstrukty (element, atribut, text), obsahové modely, entity, well-formedness, dokumentově a datově orientované XML.
- **JSON a BSON:** konstrukty (objekt, pole, hodnota), datové typy, chybějící vs. null položky, vnitřní struktura BSON dokumentu.
- **RDF:** datový model (zdroje, hodnoty), trojice (subjekt, predikát, objekt), blank nodes, IRI identifikátory, literály (typy, jazykové tagy), N-Triples a Turtle notace.
- **CSV:** konstrukty (dokument, hlavička, záznam, pole).

**3. [[Principy distribuovaných systémů a NoSQL]]**

- **Škálování:** vertikální vs. horizontální škálování (výhody, nevýhody, limity), network fallacies, architektura clusteru.
- **Distribuce dat (Sharding):** motivace, cíle (vyvážení zátěže), strategie, problémy a výzvy (rebalancing, hotspoty, změny struktury, network partitioning).
- **Replikace dat:** replikační faktor, architektury (master-slave, peer-to-peer), obsluha požadavků čtení/zápisu, řešení výpadků, strategie umisťování replik.
- **Teorémy a garance:** CAP teorém (Consistency, Availability, Partition tolerance), důsledky (systémy CA, CP, AP), ACID vs. BASE vlastnosti.
- **Konzistence:** silná (strong) vs. případná (eventual) konzistence, laditelná konzistence (tunable consistency), read a write quora, konflikty, idempotence.
- **Ladění výkonu:** Amdahlův zákon, Littleův zákon, message cost model, čtení plánů dotazů (EXPLAIN/PROFILE).

**4. [[MapReduce a Hadoop]]**

- **Programovací modely:** datový paralelizmus, task paralelizmus, předávání zpráv, sdílená paměť.
- **MapReduce:** map a reduce funkce (vstupy, výstupy), architektura clusteru (master, workers), fáze zpracování (parsing, mapping, shuffling, partitioning, combining, merging, reducing), vlastnosti combine funkce (komutativita, asociativita), řešení chyb (stragglers).
- **Hadoop a HDFS:** moduly (HDFS, YARN, MapReduce), architektura HDFS (NameNode, DataNode, HeartBeat, bloky), replikační strategie (rack-aware), FsImage a EditLog.

**5. [[Key-Value databáze (Redis)]]**

- **Obecné principy:** datový model (klíč-hodnota), správa klíčů (generované, strukturované, s předponami), základní CRUD operace, TTL.
- **Redis:** in-memory vlastnosti, objekty a datové typy (string, list, set, sorted set, hash).
- **Operace a příkazy:**
    - String: SET, GET, INCR, DEL
    - List: LPUSH, RPUSH, LPOP, RPOP, LINDEX, LRANGE
    - Set: SADD, SISMEMBER, SUNION, SINTER, SDIFF, SREM
    - Sorted set: ZADD, ZRANGE, ZINCRBY, ZREM, ZUNIONSTORE
    - Hash: HSET, HMSET, HGET, HKEYS, HVALS, HDEL
    - Základní a TTL: EXISTS, RENAME, EXPIRE, PERSIST.

**6. [[Wide Column Stores (Cassandra)]]**

- **Obecné principy:** datový model (keyspace, table/column family, row, column), návrh dle dotazů (partition key + clustering columns).
- **Datové typy a hodnoty:** primitivní typy, kolekce (list, set, map), tuples, user-defined types (UDT), frozen mode, tombstones, TTL, timestamp.
- **Cassandra Query Language (CQL):**
    - DDL: CREATE/DROP KEYSPACE, USE, CREATE/DROP/TRUNCATE TABLE.
    - DML: SELECT (FROM, WHERE, GROUP BY, ORDER BY, LIMIT, DISTINCT, ALLOW FILTERING), INSERT, UPDATE, DELETE.

**7. [[Dokumentové databáze (MongoDB)]]**

- **Obecné principy:** dokumenty (JSON/BSON), hierarchická struktura, datové modelování (vnořené dokumenty vs. reference podle vzorů dotazů a ceny updatů).
- **Dotazování a CRUD operace:** insert, update (příznaky replace, multi, upsert), remove, find.
- **Operátory:** porovnávací (eq, ne, gt, lt), prvek (exists), logické (and, or, not), pole (all, elemMatch), projekce (slice).
- **Aggregační framework:** pipelining, stages (match, group, project, sort, lookup atd.).
- **Indexování:** B-Tree struktury, typy indexů (value, hashed, multi-key), složené indexy (pravidlo ESR), vlastnosti (unique, partial, sparse, TTL).

**8. [[Grafové databáze (Neo4j)]]**

- **Obecné principy:** property grafy, vícekrokové (multi-hop) traverzování, vhodnost grafů vůči joinům v relačních DB.
- **Neo4j Datový model:** uzly, hrany (orientace), properties, labely, typy hran.
- **Traversal framework:** traversal description, expandery, uniqueness, evaluátory (all, excludeStartPosition, depth), traverser.
- **Cypher Query Language:**
    - Vyhledávání vzorů (path patterns, uzly, hrany, délky cest)
    - Čtecí klauzule: MATCH, OPTIONAL MATCH, WHERE
    - Zapisovací klauzule: CREATE, DELETE, SET, REMOVE
    - Obecné klauzule a modifikátory: RETURN, WITH, ORDER BY, LIMIT, SKIP, agregační funkce.

**9. [[Pokročilé aspekty grafových databází]]**

- **Grafové datové struktury:** matice sousednosti, seznam sousedů, matice incidence, Laplaceova matice.
- **Lokalita dat a optimalizace:** rozložení BFS (BFS layout), minimalizace šířky pásma, Cuthill-McKee algoritmus.
- **Zpracování velkých grafů:** grafové dělení (1D a 2D partitioning), matching podgrafů a supergrafů, indexování.

**10. [[RDF Stores a Sémantický web (SPARQL)]]**

- **Linked Data:** principy publikování (identifikace přes URI/URL, propojování, formáty, otevřené licence), Linked Open Data Cloud.
- **SPARQL:**
    - Formy dotazů: SELECT, ASK, DESCRIBE, CONSTRUCT.
    - Grafové vzory: basic, group, optional, alternative (UNION), minus, graph.
    - Operace a klauzule: PREFIX, BASE, BIND, FILTER (podmínky, logické spojky).
    - Modifikátory řešení: DISTINCT, REDUCED, LIMIT, OFFSET, ORDER BY.
    - Agregace: GROUP BY, HAVING.