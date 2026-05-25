- **[[Úvod do Big Data a NoSQL databází#Big Data|Big Data]]:** koncept, 5V charakteristiky (volume, variety, velocity, veracity, value), současné trendy a výzvy.
- **[[Úvod do Big Data a NoSQL databází#Relační databáze|Relační databáze]]:** funkční závislosti, normální formy, transakce, ACID vlastnosti.
- **[[Úvod do Big Data a NoSQL databází#NoSQL databáze|NoSQL databáze]]:** motivace, typy NoSQL systémů (key-value, wide column, document, graph), společné vlastnosti (agregáty, schemalessness, flexibilita, automatická údržba).
- **[[Úvod do Big Data a NoSQL databází#Návrh databází|Návrh databází]]:** "query-driven" modelování (návrh řízený přístupovými vzory), polyglot persistence.

# Big Data

Big data označují rozsáhlé, komplexní a variabilní soubory dat, které tradiční softwarové nástroje pro správu a zpracování dat (např. relační databáze) nedokáží v rozumném čase a s přijatelnými náklady efektivně zachytit, uložit, spravovat a analyzovat. Tato data pocházejí z nejrůznějších zdrojů - od senzorů IoT (Internet of things), přes sociální sítě, transakční systémy (záznamy o každodenních operacích organizace - ERP, e-shopy, ...) až po logy webových serverů.

### 5V 
znamená 5 klíčových vlastností popisujících big data. Patří mezi ně:
- **Volume (Objem)**
	- Množství generovaných a ukládaných dat. Nejedná se o gigabajty, ale o terabajty, petabajty až exabajty. Architektura řešení musí být navržena pro masivní horizontální škálování (např. distribuované systémy jako Hadoop HDFS nebo cloudová object storage).
	**Trendy:**
	- **Decoupling of Storage and Compute:** Klasické monolitické přístupy se opouštějí. Ukládání dat je odděleno od výpočetní kapacity (např. architektury typu Snowflake), což umožňuje škálovat obě vrstvy nezávisle a šetřit náklady.
	- **Přesun k NoSQL a distribuovaným architekturám:** Pro extrémní objemy dat přestávají monolitické relační databáze stačit. Architektura se posouvá k vysoce dostupným distribuovaným databázím (architektury na principech, jaké využívá např. Cassandra), které fungují bez centrálního "master" uzlu a umožňují masivní horizontální škálování bez výpadků.
	
- **Velocity (Rychlost)**
	- Rychlost, jakou jsou nová data generována a jak rychle musí být zpracována (často v reálném čase nebo near-real-time). Typickým příkladem je zpracování streamovaných dat (stream processing) z burzovních trhů nebo telemetrie z jedoucích automobilů pomocí nástrojů jako Apache Kafka nebo Apache Flink.
	**Trendy:**
	- **Stream Processing:** Systémy se mění na událostmi řízené (Event-Driven). Data se zpracovávají za letu (in-stream).
	- **IoT a Edge-to-Core pipelines:** Obrovským trendem je rychlost sběru z okrajů sítě (Edge). Vznikají komplexní pipeline, kde se lehká a rychlá komunikace z koncových senzorů a zařízení (často přes protokoly typu MQTT) okamžitě přelévá do robustních streamovacích platforem a event brokerů (jako je Kafka) pro okamžitou agregaci a analytiku, dříve než data vůbec doputují do trvalého úložiště.
	
- **Variety (Rozmanitost)**
	- Strukturovaná: Tradiční tabulky a SQL databáze.
	- Semistrukturovaná: JSON, XML, CSV.
	- Nestrukturovaná: Textové dokumenty, video, audio, obrázky.
	**Trendy:**
	- **Data Lakehouse:** Tento koncept spojuje flexibilitu datových jezer (Data Lakes, ukládající syrová, nestrukturovaná data) s transakčními vlastnostmi a strukturou tradičních datových skladů (Data Warehouses).
	- **Vektorové databáze:** S nástupem LLM (Large Language Models) a generativní AI vznikla obrovská potřeba ukládat nestrukturovaná data jako vektorové embedingy, což umožňuje rychlé sémantické vyhledávání napříč texty a multimédii.
	
- **Veracity (Věrohodnost / Pravdivost)**
	- Čistota, kvalita a důvěryhodnost dat. Vzhledem k různorodosti zdrojů obsahují Big Data často šum, chybějící hodnoty nebo anomálie.
	**Trendy:**
	- **Data Observability:** Implementují se automatizované systémy, které monitorují zdraví celých datových pipeline. Automaticky detekují anomálie, výpadky ve schématech, zpoždění dat (data freshness) nebo neočekávané změny v distribuci hodnot.
	- **Data Contracts:** Zásadní posun v inženýrských týmech. Producenti dat (např. vývojáři backendu) podepisují s konzumenty dat (datovými analytiky) technické "smlouvy" o struktuře a kvalitě dat, které nesmí breaknout nasazením nové verze aplikace.
	
- **Value (Hodnota)**
	- Nejdůležitější byznysová vlastnost. Samotný objem dat nemá smysl, pokud z něj nedokážeme analytickými nástroji, machine learningem nebo pokročilým dotazováním extrahovat užitečné insighty, které optimalizují procesy nebo predikují budoucí stav.
	**Trendy:**
	- **Operacionalizace AI (MLOps):** Hodnota se dnes tvoří nasazením prediktivních a generativních modelů přímo do produkce. Místo statických dashboardů se budují systémy, které na základě dat dělají automatická rozhodnutí (např. automatické škálování serverů, detekce anomálií v roji senzorů, realtime personalizace).
	- **Data Mesh:** Decentralizace vlastnictví dat. Místo jednoho centrálního datového týmu, který tvoří úzké hrdlo, se vlastnictví analytických dat přesouvá zpět do doménových (produktových) týmů, které dané komponenty vyvíjejí.


# Relační databáze
Relační databáze jsou například PostgreSQL, MySQL, MS SQL Server a podobně. Ukládají data do tabulek s přísným schématem. Řeší se funkční závislosti, normální formy, ACID, transakce, ...

### Příklady relačních databází

| **Vlastnost**      | <font color="#9bbb59">**PostgreSQL**</font>                     | <font color="#c0504d">**MySQL**</font>                     | <font color="#4bacc6">**MS SQL Server**</font>                   |
| ------------------ | --------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| **Zaměření**       | <font color="#9bbb59">Komplexní dotazy, přísné standardy</font> | <font color="#c0504d">Rychlé čtení, webové aplikace</font> | <font color="#4bacc6">Podnikové řešení, silný ekosystém</font>   |
| **Architektura**   | <font color="#9bbb59">Multi-process (procesy)</font>            | <font color="#c0504d">Thread-based (vlákna)</font>         | <font color="#4bacc6">Thread-based (řízeno přes SQLOS)</font>    |
| **Licence**        | <font color="#9bbb59">Open-source</font>                        | <font color="#c0504d">Open-source (vlastní Oracle)</font>  | <font color="#4bacc6">Komerční (má i free edici)</font>          |
| **Pokročilé typy** | <font color="#9bbb59">Excelentní (JSONB, PostGIS, pole)</font>  | <font color="#c0504d">Základní (podpora JSON tu je)</font> | <font color="#4bacc6">Velmi dobré (XML, JSON, prostorové)</font> |

- **PostgreSQL:** Bývá označován za nejpokročilejší open-source databázi. Striktně dodržuje SQL standardy a je stavěný na analyticky náročné a složité dotazy. Díky typu `JSONB` se dnes často využívá i jako funkční alternativa k dokumentovým NoSQL databázím.

- **MySQL:** Historicky král webových aplikací (součást tzv. LAMP stacku). Byla navržena primárně pro rychlost čtení jednodušších dotazů a vysokou propustnost uživatelů, proto často slevovala z některých přísných relačních pravidel. Její specifikem je využití "pluggable storage engines" (dnes dominuje úložiště InnoDB).

- **MS SQL Server:** Masivní komerční enterprise řešení od Microsoftu. Jeho hlavní výhodou je extrémně silný a chytrý optimalizátor dotazů, vynikající administrátorské nástroje (SQL Server Management Studio) a bezproblémová integrace s korporátním prostředím (.NET, Azure).
#### Jak u nich funguje paralelizace

Když mluvíme o paralelizaci u databází, obvykle nás zajímá **Intra-query parallelism** – tedy schopnost vzít _jeden jediný_ složitý dotaz a rozdělit jeho výpočet mezi více procesorových jader současně. Přístup těchto tří systémů se zásadně liší:

**1. MS SQL Server (Pokročilá, na bázi vláken)** MS SQL Server má paralelizaci dotaženou téměř k dokonalosti. Využívá architekturu vláken (threads), které si plánuje pomocí vlastního mini-operačního systému (SQLOS).

- **Jak to funguje:** Pokud optimalizátor zjistí, že je dotaz dostatečně "drahý" (překročí nastavený _Cost Threshold for Parallelism_), automaticky vygeneruje paralelní plán provádění. Vlákna si rozdělí práci (např. skenování tabulky) a následně se výsledky spojí.
    
- **Ovládání:** Řídí se parametrem **MAXDOP** (Maximum Degree of Parallelism), kterým administrátor určuje, kolik jader může jeden dotaz maximálně sežrat, aby nezablokoval ostatní uživatele.
    

**2. PostgreSQL (Moderní, na bázi procesů)** Postgres dlouho zvládal jen souběžné zpracování více různých dotazů (každý uživatel měl svůj proces), ale jeden dotaz vždy běžel na jednom jádře. To se změnilo ve verzi 9.6.

- **Jak to funguje:** Protože Postgres nepoužívá vlákna, využívá tzv. _Background Workers_ (pomocné procesy). Hlavní proces dotazu si najme tyto pomocné procesy, rozdělí jim práci (např. sekvenční skeny, joiny nebo agregace velkých dat) a pak si od nich sebere výsledky přes sdílenou paměť.
    
- **Ovládání:** Nastavuje se přes parametry jako `max_parallel_workers_per_gather`. Funguje to skvěle, ale je to o něco "těžkopádnější" na paměť než lehká vlákna u SQL Serveru.
    

**3. MySQL (Historicky omezená)** MySQL byla vždy optimalizována pro obrovské množství drobných, rychlých dotazů (typický webový provoz), nikoliv pro analytické dolování dat.

- **Jak to funguje:** Tradičně platilo tvrdé pravidlo: **1 dotaz = 1 vlákno = 1 jádro CPU**. Pro jeden složitý analytický SELECT MySQL neuměla využít více jader.
    
- **Současnost:** V novějších verzích (zejména od MySQL 8.0) přibyla podpora pro paralelizaci u některých specifických úloh (např. paralelní čtení z InnoDB clusteru nebo paralelní vytváření indexů), ale pro klasické rozdělení jednoho velkého OLAP dotazu stále výrazně zaostává za MS SQL i PostgreSQL.

### Funkční závislosti a Normální formy

Cílem relačního návrhu je zamezit **redundanci** (zbytečnému opakování dat) a **anomáliím** (chybám při vkládání, mazání nebo úpravě dat).

#### Funkční závislosti (Functional Dependencies)

Představte si je jako pravidlo, které říká: _"Pokud znám hodnotu atributu X, jednoznačně tím určuji hodnotu atributu Y."_ Zapisujeme to jako **X $\rightarrow$ Y**.

- **Příklad:** `Rodné číslo -> Jméno, Příjmení, Datum narození`. Pokud mi řeknete své rodné číslo, vím přesně, o koho jde.
    
- Celá normalizace databáze je v podstatě matematický proces, jak tyto závislosti správně rozházet do tabulek, aby v jedné tabulce nebyly závislosti, které tam nepatří.
    

#### Normální formy (Normal Forms - NF)

Normální formy jsou "stupně kvality" návrhu tabulky. Každá další forma je přísnější než ta předchozí. Pro státnice stačí perfektně znát první tři:

1. **První normální forma (1NF):** Atributy musí být **atomické** (nedělitelné).
    
    - _Chyba:_ V jednom sloupci `Telefon` máte uloženo "123456789, 987654321".
        
    - _Řešení:_ Každý telefon musí mít svůj vlastní záznam, neexistují žádná pole nebo seznamy v jedné buňce (což mimochodem NoSQL databázím jako MongoDB vůbec nevadí).
        
2. **Druhá normální forma (2NF):** Splňuje 1NF a **žádný neklíčový atribut nesmí záviset jen na části primárního klíče**. (Týká se jen tabulek se složeným klíčem).
    
    - _Chyba:_ Tabulka `Objednávky (ID_Objednávky, ID_Zboží, Název_Zboží, Množství)`. Klíč je složený z `(ID_Objednávky, ID_Zboží)`. Ale `Název_Zboží` závisí jen na `ID_Zboží`, nikoliv na celé objednávce.
        
    - _Řešení:_ Vytvořit samostatnou tabulku pro `Zboží`.
        
3. **Třetí normální forma (3NF):** Splňuje 2NF a **neexistují zde žádné tranzitivní závislosti**. Žádný neklíčový atribut nesmí záviset na jiném neklíčovém atributu.
    
    - _Chyba:_ Tabulka `Zaměstnanec (ID, Jméno, ID_Oddělení, Název_Oddělení)`. `Název_Oddělení` sice závisí na primárním klíči `ID` (každý zaměstnanec je v nějakém oddělení), ale nepřímo! Ve skutečnosti závisí na `ID_Oddělení`.
        
    - _Řešení:_ Odtrhnout do samostatné tabulky `Oddělení`.



### Transakce a vlastnosti ACID

Zatímco normální formy řeší, _jak jsou data uložena_, transakce a ACID řeší, _jak s nimi bezpečně manipulovat_.

Transakce je **logická jednotka práce**, která se skládá z jedné nebo více databázových operací (např. vložení, smazání, úprava). Typický příklad: Bankovní převod. Musíte odečíst peníze z účtu A (operace 1) a přičíst je na účet B (operace 2). Nesmí se stát, že proběhne jen jedna polovina.

Aby byla transakce spolehlivá, musí relační databáze garantovat vlastnosti **ACID** (což klasické RDBMS jako Postgres dělají, zatímco NoSQL systémy často volí volnější BASE přístup):

- **A – Atomicity (Nedělitelnost):** Pravidlo "všechno, nebo nic". Pokud během bankovního převodu spadne server po odečtení peněz z účtu A, databáze po restartu tuto nedokončenou transakci "vrátí zpět" (Rollback). Nikdy nezůstane napůl hotová.
    
- **C – Consistency (Konzistence):** Transakce musí převést databázi z jednoho platného stavu do druhého platného stavu. Znamená to, že nesmí porušit žádná pravidla (např. unikátní klíče, cizí klíče, nebo pravidlo, že zůstatek na účtu nesmí jít do mínusu).
    
- **I – Isolation (Izolovanost):** Pokud běží více transakcí paralelně (např. dva lidé vybírají ze stejného účtu), nesmí se navzájem ovlivnit. Databáze se tváří, jako by transakce probíhaly hezky jedna za druhou (sériově). K tomu se používají zámky (locks) nebo verzování řádků (MVCC).
    
- **D – Durability (Trvalost):** Jakmile vám databáze potvrdí, že transakce úspěšně proběhla (`COMMIT`), data už nesmí zmizet ani při okamžitém výpadku proudu. Zajišťuje se to tím, že se změny nejprve bezpečně zapíší na disk do tzv. transakčního logu (Write-Ahead Log), než se vám odpoví.



# NoSQL databáze
### Proč vlastně NoSQL vzniklo?

Relační databáze vládly světu desítky let, ale s nástupem webových gigantů (Google, Amazon, Facebook) a fenoménu **Big Data** narazily na své limity. Hlavní motivace pro NoSQL byla:

- **Horizontální škálování (Scale-out):** Relační databáze se tradičně škálují vertikálně (koupíte silnější a dražší server). To má ale fyzikální a finanční limity. NoSQL systémy byly od začátku navrženy tak, aby běžely na clusteru stovek běžných, levných serverů.
    
- **Těžkopádnost schématu a JOINů:** V distribuovaném prostředí je spojování dat (JOIN) ze dvou různých tabulek, které mohou ležet na jiných serverech na opačném konci světa, extrémně pomalé.
    
- **Změna charakteru dat:** Data už nejsou jen strukturované záznamy zaměstnanců, ale i polostrukturované logy, JSONy z API, senzory (IoT), a sociální sítě.
### Společné vlastnosti NoSQL databází

Většina NoSQL systémů sdílí následující filozofii, která je v přímém kontrastu s relačním modelem:

- **Agregáty (Aggregate-Orientation):** V relační databázi data roztříštíme (normalizujeme) do mnoha tabulek, abychom zamezili duplicitě. V NoSQL (zejména u klíč-hodnota, dokumentových a sloupcových databází) naopak **související data shlukujeme do jednoho celku (agregátu)**. _Příklad:_ Uživatel, jeho adresy a jeho historie objednávek se uloží jako jeden velký "dokument". Výhoda? Načtení profilu uživatele znamená přečtení jednoho agregátu (z jednoho disku na jednom serveru), žádné složité distribuované JOINy.
    
- **Schemalessness (Bez schématu) a Flexibilita:** Relační databáze vyžadují předem definovanou strukturu (Schema on Write). NoSQL systémy jsou typicky _schemaless_. Můžete do nich vložit záznam o uživateli, který má atribut "věk", a hned vedle záznam, který ho nemá a má navíc atribut "twitter_handle". Zodpovědnost za to, jak data vypadají, se přesouvá z databáze na aplikační kód (tzv. Schema on Read). Umožňuje to agilní vývoj.
    
- **Automatická údržba a distribuovanost:** Dělení dat (Sharding) a jejich zálohování na další uzly (Replikace) není v NoSQL chápáno jako externí modul pro administrátory, ale je to základní stavební kámen, o který se systém stará automaticky na pozadí.
### Čtyři hlavní typy NoSQL systémů

NoSQL není jedna technologie, je to rodina čtyř odlišných přístupů. Zde je jejich obecný přehled:

1. **Key-Value (Klíč-Hodnota):** Nejjednodušší a nejrychlejší. Data jsou uložena pod unikátním klíčem. Samotná "hodnota" je pro databázi černá skříňka (neprohledává ji, nerozumí jí). Slouží pro extrémně rychlé čtení/zápis (např. session uživatele, nákupní košík).
    
2. **Document (Dokumentové):** Evoluce Key-Value. Hodnota už není černá skříňka, ale semistrukturovaný dokument (např. JSON). Databáze "vidí dovnitř" a dokáže se dotazovat na specifická pole v dokumentu (např. "najdi všechny dokumenty, kde _vek > 18_").
    
3. **Wide Column (Širokosloupcové / Column-family):** Vypadá jako tabulka, ale je dimenzovaná jinak. Každý řádek může mít jiný počet sloupců a sloupce se organizují do tzv. "rodin". Skvělé pro masivní zápisy (např. časové řady z IoT senzorů). Data, která se čtou společně, se ukládají fyzicky blízko sebe na disk.
    
4. **Graph (Grafové):** "Černá ovce" NoSQL rodiny, protože **nepoužívá agregáty**. Grafové databáze jsou o _vztazích_. Data jsou uzly (lidé, města) a vztahy jsou hrany (přátelí se, žije v). Jsou optimalizované na to, aby procházení vztahů bylo bleskové (sociální sítě, doporučovací systémy).

# Návrh databází
### Query-driven modelování (Návrh řízený přístupovými vzory)

**Definice:** Přístup k návrhu databáze, kde primárním určujícím faktorem pro strukturu uložených dat nejsou entity a jejich vzájemné vztahy, ale **konkrétní dotazy (queries)** a přístupové vzory (access patterns), které bude aplikace nad daty provádět.

**Jak to funguje pod kapotou a kontext:**

V tradičním SQL světě děláme tzv. _Data-driven modelování_. Zkoumáme data, vytvoříme ER diagram, provedeme normalizaci do 3NF a data rozsekáme do tabulek. Až následně nad tím píšeme SQL dotazy.

V distribuovaném NoSQL prostředí by tento přístup vedl k obrovskému výkonnostnímu problému. Provádět složité JOINy napříč uzly (servery) v clusteru znamená síťovou komunikaci (network hops) a obrovskou latenci. Proto se návrh otáčí o 180 stupňů:

- **Analýza přístupových vzorů:** Než navrhnete jedinou "tabulku" či kolekci, musíte naprosto přesně znát aplikační požadavky (např. "budu načítat profil uživatele a zároveň jeho 5 posledních objednávek").
    
- **Denormalizace a duplikace:** Data uložíte přesně v takovém tvaru, v jakém se budou číst. Cílem je načíst výsledek jedním sekvenčním čtením z disku na jednom uzlu. Nevadí nám datová redundance (úložný prostor je levný), vadí nám procesorový a síťový čas potřebný na spojování dat.
    
- **Fixní struktura dotazů:** Z pohledu system designu to znamená jednu zásadní věc – NoSQL databáze (zejména Wide-Column systémy typu Cassandra) jsou extrémně nepružné vůči _změně_ analytických dotazů. Pokud si po roce vymyslíte nový dotaz, pro který nemáte optimalizovanou strukturu, musíte obvykle vytvořit úplně novou denormalizovanou kolekci a data do ní asynchronně zkopírovat. Je to tvrdý trade-off za extrémní rychlost čtení v obrovském měřítku.
    

### 2. Polyglot Persistence

**Definice:** Architektonický návrhový vzor spočívající ve využití více různých databázových technologií v rámci jednoho uceleného softwarového systému, přičemž každá technologie se používá na tu část domény, pro kterou je nativně optimalizována.

**Jak to funguje pod kapotou a kontext:**

Historicky panoval v korporátním vývoji "monolitický" přístup. Koupila se masivní centrální relační databáze a úplně _všechna_ data se donutila napasovat do tabulek – od finančních transakcí, přes fulltextové vyhledávání až po logování eventů. 

Moderní system design a mikroslužby (microservices) umožňují, aby si každá služba spravovala svá data sama, a to v optimálním úložišti.

**Typický produkční příklad Polyglot Persistence v e-shopu:**

- **PostgreSQL (Relační RDBMS):** Zpracovává fakturace, stavy skladů a finanční platby. Zde chceme absolutní striktnost, ACID transakce a konzistenci.
    
- **MongoDB (Dokumentová NoSQL):** Ukládá produktový katalog. Každý produkt má naprosto jiné parametry (procesor u notebooku vs. velikost u trička), zde naplno využijeme flexibilitu bez pevných schémat.
    
- **Redis (Key-Value NoSQL):** Drží nákupní košíky aktivních uživatelů a stav přihlášení (sessions). Data musí bleskurychle létat z operační paměti a po čase automaticky expirovat.
    
- **Neo4j (Grafová NoSQL):** Počítá doporučovací systém ("Zákazníci, co si koupili tuto knihu, si koupili i tuto"). Analýza sítě vztahů je zde matematicky přirozená a neporovnatelně rychlejší než rekurzivní SQL JOINy.
    
- **Elasticsearch (Search Engine):** Zajišťuje bleskové fulltextové vyhledávání přes miliony produktů s podporou překlepů a synonym.
    
