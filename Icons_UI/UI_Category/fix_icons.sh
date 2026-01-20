#!/bin/bash

# b.svg: was viewBox="122 1222 692 500"
sed -i 's|<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 692 500">|<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 692 500"><g transform="translate(-122, -1222)">|' b.svg
sed -i 's|</svg>|</g></svg>|' b.svg

# c.svg: was viewBox="1012 1105 654 693"
sed -i 's|<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 654 693">|<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 654 693"><g transform="translate(-1012, -1105)">|' c.svg
sed -i 's|</svg>|</g></svg>|' c.svg

# s.svg: was viewBox="2737 1107 690 690"
sed -i 's|<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 690 690">|<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 690 690"><g transform="translate(-2737, -1107)">|' s.svg
sed -i 's|</svg>|</g></svg>|' s.svg

# t.svg: was viewBox="3626 1105 654 693"
sed -i 's|<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 654 693">|<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 654 693"><g transform="translate(-3626, -1105)">|' t.svg
sed -i 's|</svg>|</g></svg>|' t.svg

echo "Fixed all icons"
