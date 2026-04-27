# CV source

`cv.tex` is the current LaTeX source for Holden Leslie-Bole's CV, with `citations.bib` (journal articles / reports) and `presentations.bib` (talks, posters).

## Building locally

Requires full TeX Live (2022+) with `biblatex`, `enumitem`, `fontawesome5`, `titlesec`, `supertabular`. BasicTeX will not suffice.

```
pdflatex cv.tex
bibtex cv
pdflatex cv.tex
pdflatex cv.tex
```

(`biblatex` is configured with `backend=bibtex` so `biber` is not needed.)

## Building on Overleaf

1. Upload all three files (`cv.tex`, `citations.bib`, `presentations.bib`) to an Overleaf project.
2. Set the compiler to pdfLaTeX (Menu → Compiler).
3. Build. The first build auto-runs bibtex.

## Publishing the PDF to the website

Save the compiled `cv.pdf` as `../assets/Holden_Leslie-Bole_CV.pdf`; the homepage already links there. That path is the contract; don't rename.
