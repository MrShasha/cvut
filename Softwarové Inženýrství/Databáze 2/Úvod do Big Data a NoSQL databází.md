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
- **Veracity (Věrohodnost / Pravdivost)**
	- Čistota, kvalita a důvěryhodnost dat. Vzhledem k různorodosti zdrojů obsahují Big Data často šum, chybějící hodnoty nebo anomálie.
- **Value (Hodnota)**
	- Nejdůležitější byznysová vlastnost. Samotný objem dat nemá smysl, pokud z něj nedokážeme analytickými nástroji, machine learningem nebo pokročilým dotazováním extrahovat užitečné insighty, které optimalizují procesy nebo predikují budoucí stav.

### Aktuální trendy


# Relační databáze

# NoSQL databáze
# Návrh databází
