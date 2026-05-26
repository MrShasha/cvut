## Zápis asymptotické složitosti algoritmů

Asymptotická složitost algoritmů slouží k porovnání rychlosti růstu funkcí a zanedbává konstantní faktory.

- **Asymptotická horní mez**
$$
f(n) \in O(g(n))
$$
	- hodnota funkce _f_ se nachází na nebo pod hodnotou funkce _g_ (až na konstantní faktor _c_)
	- algoritmus v nejhorším případě nepoběží pomaleji než _O(g)_

- **Asymptotická dolní mez**
$$
f(n) \in \Omega(g(n))
$$
	- hodnota funkce _f_ se nachází na nebo nad hodnotou funkce _g_ (až na konstantní faktor _c_)
	- algoritmus tedy nebude asymptoticky rychlejší

- **Asymptotická těsná mez**
$$
f(n) \in \Theta(g(n))
$$
	- hodnota funkce _f_ se asymptoticky rovná hodnotě funkce _g_ (až na konstantní faktor _c_)
	- algoritmus je shora i zdola omezen stejnou třídou funkcí