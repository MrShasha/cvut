_Zdroj pravdy: GVG_-_Přednášky.md + Pajdla 2021

---

## 1. Model perspektivní kamery

**Podstata: Kamera je lineární zobrazení 3D bodu na 2D obrazový bod přes projekční matici P = K[R|t], kde K kóduje optiku, R a t polohu kamery ve světě.**

### Projekční matice P (3×4)

```
λ · x = P · X

kde:
  X ∈ ℝ⁴   ... 3D bod v homogenních souřadnicích (světový systém)
  x ∈ ℝ³   ... 2D obrazový bod v homogenních souřadnicích
  λ > 0    ... neznámá hloubka (škálování)
  P ∈ ℝ³ˣ⁴ ... projekční matice kamery
```

### Rozklad P = K [R | −RC]

```
P = K · [R | −RC] = K · [R | t],   kde t = −RC

K = ⎡ f/sₓ   skew   u₀ ⎤    ... kalibrační matice (vnitřní parametry)
    ⎢  0     f/sᵧ   v₀ ⎥
    ⎣  0      0      1  ⎦

R ∈ SO(3)  ... rotace (vnější parametr, 3 DOF)
C ∈ ℝ³     ... střed kamery ve světových souřadnicích (vnější parametr, 3 DOF)
t = −RC    ... translace
```

### Vnitřní parametry K (5 DOF celkem)

|Parametr|Označení|Fyzikální význam|
|---|---|---|
|`f/sₓ`|K₁₁|Ohnisková vzdálenost v px (osa x)|
|`f/sᵧ`|K₂₂|Ohnisková vzdálenost v px (osa y)|
|`u₀`|K₁₃|Hlavní bod — x souřadnice středu obrazu|
|`v₀`|K₂₃|Hlavní bod — y souřadnice středu obrazu|
|`skew`|K₁₂|Šikmost pixelů (typicky ≈ 0)|

### DOF celé kamery

|Složka|DOF|Poznámka|
|---|---|---|
|K (vnitřní)|5|f/sₓ, f/sᵧ, u₀, v₀, skew|
|R (rotace)|3|Eulerovy úhly / Rodrigues / kvaternion|
|t (translace)|3|střed kamery C|
|**P celkem**|**11**|P ∈ ℝ³ˣ⁴, 12 prvků − 1 škálování|

---

## 2. Homografie — co je a kdy platí

**Podstata: Homografie H (3×3) je lineární zobrazení mezi dvěma obrazy — platí přesně ve dvou situacích: kamery se stejným středem projekce, nebo 3D body leží v jedné rovině.**

### Matematická definice

```
λ · x' = H · x

kde:
  x, x' ∈ ℝ³   ... homogenní obrazové souřadnice
  H ∈ ℝ³ˣ³     ... homografická matice, rank 3
  λ             ... neznámé škálování
```

### Tři situace kdy platí homografie

|#|Situace|Proč hloubka nevadí|
|---|---|---|
|**1**|Dvě kamery se **stejným středem C** (rotující kamera, panorama)|Paprsky vychází ze stejného bodu → závisí jen na směru, λ se vyruší|
|**2**|Libovolné kamery, ale **všechny body v rovině** (Z=0)|Třetí sloupec P vynásobí nula → z 3×4 zbyde 3×3 = H|
|**3**|Obojí najednou|Degenerovaný podpřípad|

### Vzorce pro H

**Rotující kamera (stejný střed):**

```
H = K' · R' · Rᵀ · K⁻¹
```

H kóduje pouze relativní rotaci R'Rᵀ a změnu kalibrace. Žádná translace.

**Body v rovině (obecné kamery):**

```
H = G' · G⁻¹,   kde G = [p₁ p₂ p₄]  (sloupce 1,2,4 matice P, třetí vypadl)
```

H kóduje rotaci, translaci i normálu roviny.

### DOF a počet bodů

|Vlastnost|Hodnota|
|---|---|
|Prvků v H|9|
|Mínus škálování|−1|
|**DOF**|**8**|
|Min. korespondencí|**4** (každá dá 2 rovnice → 4×2 = 8)|

### DLT algoritmus pro H (ze 4+ bodů)

```
Ze λ·x' = H·x eliminuj λ přes křížový součin:
  x' × (H·x) = 0
  → 2 lineární rovnice v 9 prvcích H

Pro každou korespondenci přidej 2 řádky do M:
  M · h = 0,   h = vec(H) ∈ ℝ⁹

Řeš přes SVD: h = poslední sloupec V z M = UΣVᵀ
Reshape h → H (3×3)

⚠️ Hartleyho normalizace souřadnic před DLT — numerická stabilita!
```

### Jak se transformují přímky pod H

```
Body:   x' = H · x           (přímo)
Přímky: l' = H⁻ᵀ · l        (POZOR: ne H·l !)
```

---

## 3. Epipolární geometrie (základ pro rekonstrukci)

**Podstata: Pokud vidím bod v prvním snímku, nevím kde je ve druhém — ale vím, že leží na konkrétní přímce (epipolární). 2D hledání se zredukuje na 1D.**

### Entity

```
C₁, C₂       ... středy kamer
b = C₁C₂     ... baseline
e₁            ... epipól = projekce C₂ do π₁
e₂            ... epipól = projekce C₁ do π₂
l₁, l₂       ... epipolární přímky (procházejí e₁, e₂)
```

**Klíčová vlastnost:** Všechny epipolární přímky v π₁ procházejí epipólem e₁.

### Fundamentální matice F

```
x₂ᵀ · F · x₁ = 0    ... epipolární constraint

Vlastnosti F:
  - rank(F) = 2  (det F = 0 — NENÍ chyba, je to constraint!)
  - 9 prvků − 1 škálování − 1 rank constraint = 7 DOF
  - F·e₁ = 0    ... e₁ je v pravém null space
  - Fᵀ·e₂ = 0   ... e₂ je v levém null space

Epipolární přímky:
  l₂ = F · x₁     ... přímka ve 2. snímku pro bod x₁ z 1. snímku
  l₁ = Fᵀ · x₂    ... přímka v 1. snímku pro bod x₂ z 2. snímku
```

### Esenciální matice E (kalibrované kamery)

```
E = K₂ᵀ · F · K₁ = R · [t]×

Vlastnosti E:
  - rank(E) = 2
  - 5 DOF (jen vnější parametry: R a t bez škálování)
  - Z E → 4 kandidáti (±R, ±t) → výběr cheiralitou (ζ > 0)
```

### F vs E — kdy co

||F|E|
|---|---|---|
|Kamery|Nekalibrované|Kalibrované (K známé)|
|Souřadnice|Pixely|Normalizované|
|DOF|7|5|
|Min. bodů|7 (nebo 8)|5|

---

## 4. Rekonstrukční algoritmy (odhad H, F, E)

|Matice|DOF|Min. bodů|Algoritmus|
|---|---|---|---|
|H|8|**4**|DLT + RANSAC|
|F|7|**7**|7-bodový (1 nebo 3 řešení)|
|F|7|**8**|8-bodový (vynuť rank 2 SVD)|
|E|5|**5**|5-bodový, Nistér (vyžaduje K)|
|P|11|**6**|DLT / resekce (camera pose)|

### 8-bodový algoritmus pro F

```
1. Normalizuj souřadnice (Hartley)
2. Každá korespondence → 1 řádek do M (9 neznámých)
3. Řeš M·f = 0 přes SVD → F̃
4. Vynuť rank 2: F̃ = UΣVᵀ, nuluj nejmenší σ → F
5. Denormalizuj F
```

### RANSAC (robustní odhad)

```
Opakuj N krát:
  1. Vyber náhodně minimum bodů (4 pro H, 7/8 pro F, 5 pro E)
  2. Spočítej model (H/F/E)
  3. Spočítej inliery: body kde Sampsonova vzdálenost < ε
Vrať model s nejvíce inliery

N = log(1 − p) / log(1 − (1−e)^s)
  p = požadovaná pravděpodobnost úspěchu (0.99)
  e = podíl outlierů
  s = min. počet bodů
```

---

## 5. Panorama — Sýkorova otázka 2017 ⭐

**Podstata: Panorama funguje protože rotující kamera má fixní střed projekce → homografie platí přesně bez ohledu na hloubku scény.**

### Pipeline

```
Vstup: n fotografií rotující kamerou (fixní střed C)

Krok 1 — Detekce příznaků
  SIFT v každém snímku: zájmové body + 128D deskriptory

Krok 2 — Matching
  Nearest-neighbor matching + Lowe ratio test (< 0.8)

Krok 3 — Robustní odhad H
  RANSAC + DLT na 4 bodech → H pro každý sousední pár
  Inlier test: přenosová chyba ||x' − Hx|| < ε

Krok 4 — Výběr referenčního snímku
  Typicky prostřední (minimalizuje celkové zkreslení)

Krok 5 — Warping
  Každý snímek transformuj do referenčního souřadného systému přes H
  (nebo cylindrická/sférická projekce pro velké úhly)

Krok 6 — Blending
  Multi-band blending v překrývajících se oblastech
  (potlačení ghostingu z exposure rozdílů)

Výstup: panoramatický snímek
```

**Proč to funguje matematicky:** H = K'·R'·Rᵀ·K⁻¹ — závisí jen na relativní rotaci, ne na hloubce → platí pro libovolnou scénu.

---

## 6. 3D rekonstrukce ze 2 snímků

**Podstata: Ze dvou snímků kalibrovaných kamer dostaneme R a t (až na měřítko) a triangulací 3D souřadnice bodů.**

### Pipeline (kalibrované kamery)

```
Vstup: snímky I₁, I₂ + kalibrační matice K₁, K₂

1. Korespondence: SIFT + matching + RANSAC

2. Odhad F → E:
   E = K₂ᵀ · F · K₁

3. Dekompozice E → R, t:
   E = UΣVᵀ
   → 4 kandidáti (±R, ±t)
   Výběr cheiralitou: triangulovaný bod musí být před oběma kamerami (ζ > 0)

4. Nastavení kamer:
   P₁ = [I | 0]          (referenční souřadný systém)
   P₂ = [R | −Rt]        (relativní poloha)

5. Triangulace (DLT):
   Ze λ₁x₁ = P₁X a λ₂x₂ = P₂X eliminuj λ:
   → homogenní soustava AX = 0, A ∈ ℝ⁴ˣ⁴
   → SVD: X = poslední sloupec V

Výstup: R, t (až na měřítko), sparse 3D body
```

### Nekalibrované kamery → projektivní rekonstrukce

Bez K dostaneme pouze projektivní rekonstrukci — tvar správný jen do projektivní transformace 4×4. Pro metrickou rekonstrukci (správné vzdálenosti, úhly) potřebujeme K.

```
F  +  K₁, K₂  →  E  →  R, t  →  metrická rekonstrukce
F  bez K       →  pouze projektivní rekonstrukce
```

### Gauge freedom (nejednoznačnost rekonstrukce)

Ze snímků nelze určit absolutní měřítko ani absolutní polohu:

```
Pokud (P₁, P₂, {Xⱼ}) je platná rekonstrukce,
pak pro libovolnou 4×4 matici H platí také:
  P₁' = P₁H⁻¹,  P₂' = P₂H⁻¹,  Xⱼ' = HXⱼ
```

Fixuje se volbou souřadného systému (gauge fixing): P₁ = [I|0], měřítko z reálné délky.

---

## 7. Structure from Motion (SfM) — inkrementální pipeline

**Podstata: SfM rekonstruuje 3D scénu a pohyb kamery z libovolné sady fotografií — krok po kroku přidáváme kamery a body, průběžně opravujeme bundle adjustmentem.**

### Kompletní pipeline

```
VSTUP: n fotografií (nic jiného — žádné kamery, žádné 3D body)

── Krok 1: Feature Detection + Matching ──
  SIFT → 128D deskriptory v každém snímku
  Nearest-neighbor matching + Lowe ratio test
  Výstup: korespondence xᵢ ↔ xⱼ mezi snímky

── Krok 2: RANSAC + F/E Fitting ──
  Náhodný výběr 7 nebo 5 bodů
  Fit F nebo E
  Inlier test: Sampsonova vzdálenost < ε
  Výstup: F/E + inliery (outliers zahozeny)

── Krok 3: Two-View Inicializace ──
  Výběr dobrého počátečního páru:
    • mnoho inlierů
    • neplanární scéna (poměr #inliers(E/F) / #inliers(H) velký)
    • žádný čistý dopředný pohyb
  E → SVD → 4 kandidáti P₂ → cheiralita → P₂ vybrán
  P₁ = [I|0], P₂ = [R|−Rt]
  Triangulace počátečních 3D bodů

── opakuj pro každý další snímek ──

── Krok 4: Extend Motion (PnP) ──
  Vyber snímek s nejvíce shodami se stávajícími 3D body
  2D-3D korespondence: xᵢ ↔ Xⱼ (min 6 bodů)
  PnP (DLT resekce) → nová kamera Pₙ

── Krok 5: Extend Structure ──
  Triangulace nových 3D bodů z nové kamery + existujících

── Krok 6: Bundle Adjustment (PRŮBĚŽNĚ!) ──
  min_{Pᵢ, Xⱼ}  Σᵢⱼ  wᵢⱼ · ||xᵢⱼ − π(Pᵢ, Xⱼ)||²
  Levenberg-Marquardt
  ⚠️ PRŮBĚŽNĚ po každé nové kameře — ne jen na konci!

VÝSTUP: sparse point cloud + pozice kamer
        (rekonstrukce určena do podobnostní transformace)
```

### Bundle Adjustment — jak funguje L-M

```
Rovnice: (JᵀJ + λI) · Δ = −Jᵀr

λ malé (→ 0):  Gauss-Newton — rychlý blízko minima
λ velké (→ ∞): Gradient descent — stabilní daleko od minima

Adaptace λ:
  Chyba klesla  → sniž λ   (jdeme správně, přiblíž Gauss-Newtonu)
  Chyba neklesla → zvyš λ  (zasekli jsme se, přejdi na gradient descent)
```

---

## 8. Přehled algoritmů — tabulka

|Úloha|Vstup|Výstup|Algoritmus|Min. body|
|---|---|---|---|---|
|Odhad H|Korespondence|Homografie (8 DOF)|DLT + RANSAC|4|
|Odhad F|Korespondence|Fundam. matice (7 DOF)|8-bod. + SVD rank 2|7–8|
|Odhad E|Korespondence + K|Esenciální matice (5 DOF)|5-bod. (Nistér)|5|
|Odhad P|3D↔2D korespondence|Projekční matice (11 DOF)|DLT / resekce|6|
|Triangulace|P₁, P₂ + korespondence|3D bod X|DLT (SVD)|1 pár|
|SfM motion|Sekvence snímků|R, t kamer + body|Inkrementální SfM|—|
|Panorama|Rotující snímky|Spojený snímek|SIFT+RANSAC+H+warp|4/pár|

---

## 9. Státnicové chytáky (Sýkora)

|Trap|Správná odpověď|
|---|---|
|rank(F) = 3?|NE — rank(F) = 2, det(F) = 0 je constraint, ne chyba. Epipól leží v null space F.|
|F = E?|NE — F pro nekalibrované kamery (pixely, 7 DOF), E pro kalibrované (normalizované, 5 DOF)|
|H má 9 DOF?|NE — 8 DOF (9 prvků − 1 škálování)|
|Z F dostanu 3D souřadnice?|NE — F dává jen epipolární přímku. Pro 3D potřebuješ E (nebo F + K) + triangulaci.|
|l₂ = F·x₁ nebo Fᵀ·x₁?|l₂ = F·x₁ (přímka ve 2. snímku). l₁ = Fᵀ·x₂ (přímka v 1. snímku). Pozor na transpozici!|
|Epipól e₂ je v levém nebo pravém null space F?|Levém: Fᵀ·e₂ = 0 (ne F·e₂ = 0)|
|Rekonstrukce je jednoznačná?|NE — gauge freedom: určena jen do podobnostní transformace. Měřítko chybí.|
|Bundle adjustment jen na konci?|NE — průběžně po každé přidané kameře!|
|Panorama proč funguje?|Rotující kamera = fixní střed → H = K'R'RᵀK⁻¹ → platí bez ohledu na hloubku.|
|4 řešení z E — jak vybrat?|Cheiralitní test: triangulovaný bod musí mít ζ > 0 (být před oběma kamerami).|

---

_Tahák: kamera + homografie + 3D rekonstrukce | GVG | Sýkora | Červen 2026_