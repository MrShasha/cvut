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

| **Vlastnost**      | <font color="#9bbb59">**PostgreSQL**</font>                     | *<font color="#c0504d">*MySQL**</font>                     | <font color="#4bacc6">**MS SQL Server**</font>                   |
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
# Návrh databází
