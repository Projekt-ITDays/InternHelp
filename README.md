# InternHelp

InternHelp is an autonomous career planning engine that turns job requirements into verified, step-by-step technical roadmaps for students entering IT.

Most students graduate into a competitive market with general computer science theory, but lack a clear path toward production-grade engineering roles. Static roadmaps fail to account for what an applicant already knows, while raw LLM prompts lack market data. InternHelp replaces both with a multi-agent workflow built on NestJS and LangGraph. The pipeline evaluates candidate skills, scrapes live technical requirements, and compiles an interactive milestone roadmap with measurable task progression.

> Built in collaboration with a mentor from Google for AGH University IT Days.

---

## What it does

Students complete a skills and goals survey. An AI agent processes the responses, queries a curated resource database, and builds a milestone roadmap with XP tracking.

### Core features

- **AI career agent.** LangChain and LangGraph agent that turns survey responses into structured roadmaps.
- **Interactive roadmap.** Visual honeycomb grid with completable milestones and XP progression.
- **Skill survey.** Tag-based input for skills, tools, and career targets.
- **Gamification.** XP system with levels and task completion tracking.
- **Dashboard.** Overview and status of generated career plans.
- **Web scraper.** Scrapes technical learning resources to keep the agent knowledge base current.

---

## Tech stack

### Frontend
| Technology | Purpose |
|---|---|
| Angular | SPA framework |
| TypeScript | Language |
| CSS | Styling |

### Backend
| Technology | Purpose |
|---|---|
| NestJS | REST API framework |
| LangChain | LLM orchestration |
| LangGraph | Agent workflow graph |
| MongoDB | Database |
| TypeScript | Language |

### Infrastructure
| Technology | Purpose |
|---|---|
| Docker, Docker Compose | Container runtime |
| GitHub Actions | CI and automated checks |

---

## Monorepo structure

```
InternHelp/
├── backend/          # NestJS API and AI agent
│   ├── src/
│   │   ├── agent/    # LangChain agent
│   │   ├── scraper/  # Web scraper for knowledge base
│   │   └── plans/    # Career plan generation
│   └── package.json
├── frontend/         # Angular application
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/       # Plans overview
│   │   │   ├── roadmap/         # Interactive roadmap component
│   │   │   └── survey/          # User skills survey
│   └── package.json
├── docker-compose.yml
├── features.md       # Planned UX improvements
└── tasks.md          # Team task tracker
```

---

## Getting started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/)

### Run with Docker

```bash
git clone https://github.com/Projekt-ITDays/InternHelp.git
cd InternHelp
docker-compose up --build
```

### Install dependencies locally

```bash
cd backend && npm install
cd ../frontend && npm install
```

The application runs at:
- Frontend: `http://localhost:4200`
- Backend API: `http://localhost:3000`

---

## AI agent

The agent processes user input in four steps:

1. Collects survey data, including skills, goals, and experience level.
2. Queries the knowledge base populated by the web scraper.
3. Generates a structured roadmap with milestones and learning resources.
4. Returns the roadmap to the frontend.

---

## Planned features

- [ ] Tag input for skills in the survey
- [ ] Plan deletion and archiving in the dashboard
- [ ] Direct links on roadmap milestone resources
- [ ] Task completion animations
- [ ] PDF export for generated plans

---

## Team

Built by students of AGH University of Science and Technology for IT Days.

| Role | Person |
|---|---|
| Team Lead, Software Engineer | [Bartosz Brańka](https://github.com/Dyzio9666) |
| DevOps | Adam Batko |
| Software Engineer | Mikołaj Buczyński |
| Software Engineer | Krzysztof Chowaniec |

---


## Video generated using the `/brag` skill

https://github.com/user-attachments/assets/e3d1370f-e50e-406c-8a40-001aa4d0b8ae

