# Repository Structure

## Purpose

Kangaroo-Practice-Simulator is organized into three independent layers.

## 1. Web Platform

Location:

```
src/
public/
package.json
```

Responsibilities:

- student experience
- exams
- grading
- analytics
- authentication

## 2. Competition Agent

Location:

```
competition-agent/
```

Responsibilities:

- competition document ingestion
- native PDF parsing
- question structure extraction
- translation pipeline

## 3. Solution Engine

Location:

```
solution-engine/
```

Responsibilities:

- AI solution generation
- explanation storyboard
- animation preparation

## Rules

- Generated files are not committed unless they are verified datasets.
- Temporary outputs stay outside the repository.
- Source code and datasets must have clear ownership.
- Local machines are test environments only.
