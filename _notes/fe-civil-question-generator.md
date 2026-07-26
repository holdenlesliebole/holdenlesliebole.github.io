---
title: "A practice-question generator for the FE Civil exam"
date: 2026-07-26
tags: [llm, tools, civil-engineering]
summary: "A local study tool that generates FE Civil practice questions with Claude, and a note on the accuracy problem it does not solve."
---

I am sitting the NCEES FE Civil exam, and wanted practice questions I could aim at one
topic at a chosen difficulty rather than working a fixed bank in order. This is the tool I
built for that. It runs on my own machine, generates each question on demand, and keeps a
record of what I have answered.

It is a study aid rather than a product. The repository is public because the code is
small and someone preparing for the same exam might want the pattern. It is not public
because the questions have been checked.

## What it does

A React front end talks to a small Express server that holds the API key. The server
exposes a handful of endpoints: generate a question for a given topic and difficulty,
stream the worked solution, answer a follow-up in a tutor chat, locate a formula in the
reference handbook, and append results to a local JSON file. Questions stream as they are
written, so text appears immediately instead of after a wait.

<figure>
  <img src="{{ '/assets/notes/fe_setup.png' | relative_url }}" alt="The session setup screen: a topic-area dropdown set to random weighted by exam frequency, difficulty buttons for easy, medium and hard, a question-count selector, and a start button." />
  <figcaption>Session setup. Topic area, difficulty, and session length are chosen per session; the running API spend is printed under the title.</figcaption>
</figure>

Each question returns as structured JSON: the statement, four choices, the correct letter,
a step-by-step solution, a pointer into the FE Reference Handbook, and a subtopic label.
The handbook pointer is the field I use most. The exam is open-handbook, and a real part
of the skill being tested is finding the right table quickly, so a question that names the
section it came from trains the lookup alongside the physics.

<figure>
  <img src="{{ '/assets/notes/fe_question_structural.png' | relative_url }}" alt="A generated hard structural engineering question about the flexural adequacy of a simply supported W18x50 steel beam, with a handbook pointer above the statement and four numerical answer choices below it." />
  <figcaption>A generated question. The grey band above the statement is the handbook pointer; the four choices are built from specific mistakes rather than arbitrary numbers.</figcaption>
</figure>

<figure>
  <img src="{{ '/assets/notes/fe_solution_structural.png' | relative_url }}" alt="The same question after answering, showing the correct choice highlighted in green and a step-by-step worked solution followed by an explanation of why each of the other three choices is wrong." />
  <figcaption>The worked solution, with a per-distractor account of which mistake produces which wrong answer. On this problem the key and every step of the arithmetic are right; the note below is about the cases where they are not.</figcaption>
</figure>

## The part that is not solved

The generator is asked to check its own work. Before writing the choices it is required to
solve the problem, confirm its computed answer appears among the four, verify trigonometry
and units and sign conventions, and substitute the chosen answer back into the governing
equation. Those instructions reduce the error rate. They do not measure it.

Nothing in the app verifies a generated question against an independent solution. A
question whose answer key is wrong looks exactly like one whose answer key is right, and
that is the failure mode that matters when the tool is being used to learn rather than to
demonstrate. A wrong key does not simply fail to teach. It teaches something incorrect,
and the person studying has no signal that it happened.

Measuring this means working a sample of generated questions by hand and reporting how
often the key disagrees with the worked answer. I have not done that. Until I do, the
accurate description is that the tool produces plausible FE-style questions of unmeasured
correctness, and I treat any disagreement between my solution and its key as a question
about the key before it is a question about my arithmetic.

## Why it is not hosted on this site

Two reasons, pointing the same direction. The site is static, and this needs a server
holding an API key, which turns a study tool into a metered endpoint open to the internet.
It also needs the FE Reference Handbook, which NCEES distributes under its own terms and
which I cannot redistribute.

So the code is on GitHub and running it means supplying your own key and your own copy of
the handbook. Source and setup instructions:
[github.com/holdenlesliebole/fe-civil-app](https://github.com/holdenlesliebole/fe-civil-app).
