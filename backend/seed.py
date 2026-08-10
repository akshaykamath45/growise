"""Seed the Growise catalog with realistic courses (dual-written to SQLite + Chroma)
and create a default admin account.

Run with: python seed.py
"""

from copy import deepcopy

from app.auth import hash_password
from app.database import Base, SessionLocal, engine, ensure_schema
from app.models import Product, User, UserRole
from app.schemas import ProductCreate
from app.services import product_service

ADMIN_EMAIL = "admin@growise.dev"
ADMIN_PASSWORD = "AdminPass123"

COURSES: list[dict] = [
    # ---- AI & Agents ----
    dict(title="Production LangGraph: Agents That Ship", instructor="Dr. Amara Osei", category="AI & Agents",
         level="Intermediate", price=79, old_price=149, duration_label="12H 40M", lessons_count=48,
         rating=4.8, reviews_count=2431, tags="langgraph,agents,production,observability",
         description="Build, evaluate and deploy multi-step agents that survive real traffic — retries, human handoff, cost ceilings, and the observability to prove any of it works."),
    dict(title="Evaluating LLM Systems", instructor="Ken Watanabe", category="AI & Agents",
         level="Intermediate", price=59, old_price=119, duration_label="6H 15M", lessons_count=24,
         rating=4.7, reviews_count=613, tags="evals,llm,testing,quality",
         description="Move past vibes-based prompting. Build eval harnesses, golden datasets, and regression suites that catch quality drift before your users do."),
    dict(title="Vector Databases in Production", instructor="Lena Fischer", category="AI & Agents",
         level="Intermediate", price=69, old_price=129, duration_label="9H 10M", lessons_count=34,
         rating=4.7, reviews_count=1102, tags="vector-db,rag,embeddings",
         description="Chroma, Pinecone, Qdrant — pick the right vector store, design your indexing strategy, and keep embeddings in sync with your source of truth."),
    dict(title="Tool Use & Function Calling Deep Dive", instructor="Marcus Reid", category="AI & Agents",
         level="Intermediate", price=65, old_price=None, duration_label="8H 05M", lessons_count=30,
         rating=4.6, reviews_count=742, tags="function-calling,tools,agents",
         description="Give your agents real capabilities: structured tool schemas, parallel calls, error recovery, and guardrails that stop a bad tool call from cascading."),
    dict(title="Multi-Agent Systems in Practice", instructor="Dr. Amara Osei", category="AI & Agents",
         level="Advanced", price=89, old_price=169, duration_label="11H 30M", lessons_count=42,
         rating=4.9, reviews_count=418, tags="multi-agent,orchestration,advanced",
         description="Design agent teams that plan, delegate, and critique each other's work — with the coordination patterns that keep them from spiraling into loops."),
    dict(title="Retrieval Systems that Scale", instructor="Sofia Alvarez", category="AI & Agents",
         level="Intermediate", price=75, old_price=None, duration_label="10H 00M", lessons_count=38,
         rating=4.5, reviews_count=1265, tags="retrieval,rag,search",
         description="Chunking strategy, hybrid search, re-ranking, and metadata filtering — the unglamorous decisions that separate a demo RAG app from a production one."),
    dict(title="Prompt Engineering for Engineers", instructor="Sam Otieno", category="AI & Agents",
         level="Beginner", price=49, old_price=99, duration_label="5H 45M", lessons_count=28,
         rating=4.5, reviews_count=3048, tags="prompting,fundamentals",
         description="A systematic approach to prompting: templates, few-shot patterns, and structured outputs, taught like an engineering discipline instead of a bag of tricks."),

    # ---- Web Development ----
    dict(title="Full-Stack Next.js: From Zero to Deployed", instructor="Priya Nair", category="Web Development",
         level="Beginner", price=59, old_price=109, duration_label="14H 20M", lessons_count=52,
         rating=4.7, reviews_count=2884, tags="nextjs,react,fullstack",
         description="App Router, server components, and edge deployment — ship a real full-stack product, not just a todo app."),
    dict(title="Advanced React Patterns", instructor="Diego Morales", category="Web Development",
         level="Advanced", price=69, old_price=None, duration_label="8H 40M", lessons_count=32,
         rating=4.8, reviews_count=1540, tags="react,patterns,advanced",
         description="Compound components, render props, custom hooks, and state machines — the patterns senior React engineers actually reach for."),
    dict(title="API Design with FastAPI", instructor="Noah Kim", category="Web Development",
         level="Intermediate", price=55, old_price=99, duration_label="7H 15M", lessons_count=26,
         rating=4.6, reviews_count=902, tags="fastapi,api,backend",
         description="Build APIs that are a pleasure to consume: proper status codes, pagination, versioning, and OpenAPI docs that stay accurate."),
    dict(title="TypeScript for Large Codebases", instructor="Elena Petrova", category="Web Development",
         level="Intermediate", price=59, old_price=None, duration_label="9H 30M", lessons_count=36,
         rating=4.7, reviews_count=1187, tags="typescript,scale",
         description="Generics, discriminated unions, and the type patterns that keep a 200k-line codebase honest as it grows."),
    dict(title="Web Performance Engineering", instructor="Tomás Herrera", category="Web Development",
         level="Advanced", price=79, old_price=139, duration_label="10H 05M", lessons_count=30,
         rating=4.6, reviews_count=534, tags="performance,web-vitals",
         description="Core Web Vitals, bundle splitting, and rendering strategy — diagnose and fix the performance issues that actually move the needle."),
    dict(title="CSS That Scales: Design Systems in Practice", instructor="Noor Haddad", category="Web Development",
         level="Intermediate", price=49, old_price=None, duration_label="6H 50M", lessons_count=24,
         rating=4.8, reviews_count=1201, tags="css,design-systems",
         description="Token-driven styling, component APIs, and the conventions that keep a design system consistent across a growing team."),
    dict(title="Authentication & Authorization Done Right", instructor="Marcus Reid", category="Web Development",
         level="Intermediate", price=65, old_price=119, duration_label="7H 40M", lessons_count=28,
         rating=4.7, reviews_count=876, tags="auth,security,backend",
         description="Sessions, JWTs, OAuth, and RBAC — implement auth you'd trust in production, and understand exactly what each approach trades off."),

    # ---- Data Science ----
    dict(title="Feature Engineering at Scale", instructor="Priya Raman", category="Data Science",
         level="Advanced", price=99, old_price=None, duration_label="18H 05M", lessons_count=62,
         rating=4.6, reviews_count=886, tags="features,ml,pipelines",
         description="Build feature pipelines that hold up under real data drift, not just the notebook that got you to a good offline metric."),
    dict(title="Streaming Data Pipelines with Kafka", instructor="Priya Raman", category="Data Science",
         level="Advanced", price=99, old_price=None, duration_label="16H 20M", lessons_count=58,
         rating=4.6, reviews_count=886, tags="kafka,streaming,data-engineering",
         description="Design event-driven pipelines that process data as it arrives — partitioning, exactly-once semantics, and the failure modes that actually happen."),
    dict(title="Statistics for Data Scientists", instructor="Hana Kobayashi", category="Data Science",
         level="Beginner", price=45, old_price=89, duration_label="8H 10M", lessons_count=34,
         rating=4.5, reviews_count=2210, tags="statistics,fundamentals",
         description="The statistical foundations that actually come up in practice: hypothesis testing, confidence intervals, and knowing when a result is noise."),
    dict(title="Practical Machine Learning with scikit-learn", instructor="Ben Ackerman", category="Data Science",
         level="Beginner", price=49, old_price=None, duration_label="9H 45M", lessons_count=38,
         rating=4.6, reviews_count=1876, tags="ml,scikit-learn",
         description="From raw data to a deployed model — regression, classification, and the validation discipline that keeps you from fooling yourself."),
    dict(title="Deep Learning Foundations", instructor="Ravi Chandran", category="Data Science",
         level="Intermediate", price=69, old_price=129, duration_label="11H 20M", lessons_count=40,
         rating=4.7, reviews_count=1345, tags="deep-learning,neural-networks",
         description="Backprop, optimization, and architecture choices explained from first principles — building the intuition, not just the framework calls."),
    dict(title="Experiment Design & A/B Testing", instructor="Clara Jensen", category="Data Science",
         level="Intermediate", price=55, old_price=None, duration_label="6H 30M", lessons_count=22,
         rating=4.6, reviews_count=690, tags="experimentation,ab-testing",
         description="Design experiments that actually answer your question — power analysis, guardrail metrics, and reading results without fooling yourself."),
    dict(title="SQL for Analytics at Scale", instructor="Ben Ackerman", category="Data Science",
         level="Beginner", price=39, old_price=69, duration_label="5H 50M", lessons_count=26,
         rating=4.7, reviews_count=2540, tags="sql,analytics",
         description="Window functions, CTEs, and query optimization for the queries that run against billions of rows, not a sample dataset."),

    # ---- Cloud & DevOps ----
    dict(title="Kubernetes in Production", instructor="Jorge Villanueva", category="Cloud & DevOps",
         level="Advanced", price=89, old_price=159, duration_label="13H 15M", lessons_count=46,
         rating=4.7, reviews_count=1023, tags="kubernetes,devops",
         description="Beyond kubectl apply — autoscaling, resource limits, and the operational discipline that keeps clusters stable at 3am."),
    dict(title="AWS Solutions Architect Bootcamp", instructor="Grace Odhiambo", category="Cloud & DevOps",
         level="Intermediate", price=79, old_price=139, duration_label="15H 40M", lessons_count=54,
         rating=4.6, reviews_count=3120, tags="aws,cloud,architecture",
         description="Design resilient, cost-aware architectures on AWS — the same tradeoffs you'll face on the actual associate exam and in production."),
    dict(title="CI/CD Pipelines that Don't Break", instructor="Tom Baird", category="Cloud & DevOps",
         level="Intermediate", price=55, old_price=None, duration_label="6H 45M", lessons_count=24,
         rating=4.6, reviews_count=745, tags="cicd,github-actions",
         description="Build pipelines that catch problems before deploy — caching, parallelization, and rollback strategies that make releases boring."),
    dict(title="Infrastructure as Code with Terraform", instructor="Grace Odhiambo", category="Cloud & DevOps",
         level="Intermediate", price=65, old_price=119, duration_label="8H 30M", lessons_count=30,
         rating=4.7, reviews_count=892, tags="terraform,iac",
         description="Model your infrastructure as versioned, reviewable code — modules, state management, and the patterns that avoid drift."),
    dict(title="Observability: Logs, Metrics, and Traces", instructor="Jorge Villanueva", category="Cloud & DevOps",
         level="Advanced", price=75, old_price=None, duration_label="9H 00M", lessons_count=32,
         rating=4.7, reviews_count=610, tags="observability,monitoring",
         description="Instrument systems so an incident tells its own story — structured logging, distributed tracing, and dashboards people actually check."),
    dict(title="Docker Deep Dive", instructor="Tom Baird", category="Cloud & DevOps",
         level="Beginner", price=39, old_price=69, duration_label="5H 20M", lessons_count=20,
         rating=4.6, reviews_count=1980, tags="docker,containers",
         description="Images, layers, networking, and compose — the mental model that makes containers stop feeling like magic."),
    dict(title="Site Reliability Engineering Fundamentals", instructor="Naledi Mokoena", category="Cloud & DevOps",
         level="Advanced", price=85, old_price=149, duration_label="10H 15M", lessons_count=36,
         rating=4.8, reviews_count=528, tags="sre,reliability",
         description="SLOs, error budgets, and incident response — the SRE practices that turn uptime into an engineering discipline instead of a hope.",
         course_content={
             "overview": "Turn reliability from a vague aspiration into an operating practice. You will define service-level objectives, run calm and useful incident response, and build the feedback loops that make each release and on-call shift safer.",
             "outcomes": [
                 "Define meaningful SLIs and SLOs that reflect what users actually experience.",
                 "Use error budgets to balance reliability work with product delivery.",
                 "Write practical runbooks and lead blameless incident reviews.",
                 "Build an on-call practice that protects both customers and engineers.",
             ],
             "sections": [
                 {
                     "title": "Reliability as a product decision",
                     "summary": "Establish the shared language, service boundaries and user journeys that make reliability measurable.",
                     "duration_label": "1H 12M",
                     "lessons": [
                         {"title": "What SRE changes — and what it does not", "duration_label": "16M"},
                         {"title": "Map the journeys your users rely on", "duration_label": "18M"},
                         {"title": "Service ownership and dependency boundaries", "duration_label": "20M"},
                         {"title": "Workshop: write your reliability charter", "duration_label": "18M"},
                     ],
                 },
                 {
                     "title": "SLIs, SLOs and error budgets",
                     "summary": "Turn user expectations into measurable targets, then use the results to guide delivery decisions.",
                     "duration_label": "1H 38M",
                     "lessons": [
                         {"title": "Selecting signals that users would recognise", "duration_label": "22M"},
                         {"title": "Setting an SLO without choosing false precision", "duration_label": "24M"},
                         {"title": "Error budgets as a team decision tool", "duration_label": "20M"},
                         {"title": "Lab: create an SLO dashboard brief", "duration_label": "18M"},
                         {"title": "Review: common SLO anti-patterns", "duration_label": "14M"},
                     ],
                 },
                 {
                     "title": "Observability that explains the system",
                     "summary": "Design the logs, metrics and traces that help responders understand impact and narrow a failure quickly.",
                     "duration_label": "1H 28M",
                     "lessons": [
                         {"title": "The questions every dashboard should answer", "duration_label": "18M"},
                         {"title": "Golden signals and business context", "duration_label": "20M"},
                         {"title": "Tracing a request through a distributed system", "duration_label": "22M"},
                         {"title": "Alert design: actionable, timely and calm", "duration_label": "16M"},
                         {"title": "Lab: make an alert runbook-ready", "duration_label": "12M"},
                     ],
                 },
                 {
                     "title": "Incident response without chaos",
                     "summary": "Build the roles, communication habits and runbooks that make a stressful incident easier to manage.",
                     "duration_label": "1H 31M",
                     "lessons": [
                         {"title": "Declare, assess and assign roles", "duration_label": "19M"},
                         {"title": "Communicating impact to customers and stakeholders", "duration_label": "17M"},
                         {"title": "Runbooks that support judgment, not scripts", "duration_label": "21M"},
                         {"title": "Simulation: work through a degraded checkout", "duration_label": "22M"},
                         {"title": "The first hour after recovery", "duration_label": "12M"},
                     ],
                 },
                 {
                     "title": "Learning from failure",
                     "summary": "Turn incidents and near misses into concrete, blameless improvements that teams will actually complete.",
                     "duration_label": "1H 10M",
                     "lessons": [
                         {"title": "A timeline that reveals, rather than assigns blame", "duration_label": "17M"},
                         {"title": "Writing corrective actions with clear owners", "duration_label": "19M"},
                         {"title": "Tracking reliability debt alongside product work", "duration_label": "18M"},
                         {"title": "Review: facilitate a learning-focused postmortem", "duration_label": "16M"},
                     ],
                 },
                 {
                     "title": "Sustainable on-call and continuous improvement",
                     "summary": "Set healthy support expectations and create a reliability roadmap that keeps the practice moving forward.",
                     "duration_label": "1H 16M",
                     "lessons": [
                         {"title": "On-call rotations people can sustain", "duration_label": "18M"},
                         {"title": "Reducing toil before it burns out the team", "duration_label": "20M"},
                         {"title": "Capacity, resilience and game-day planning", "duration_label": "21M"},
                         {"title": "Capstone: present your 90-day reliability plan", "duration_label": "17M"},
                     ],
                 },
             ],
         }),

    # ---- Design ----
    dict(title="Design Systems for Product Teams", instructor="Noor Haddad", category="Design",
         level="Intermediate", price=59, old_price=None, duration_label="7H 30M", lessons_count=31,
         rating=4.8, reviews_count=1540, tags="design-systems,ui",
         description="Build a design system that a growing team actually adopts — tokens, component contracts, and the governance that keeps it from rotting.",
         course_content={
             "overview": "A practical, end-to-end guide to turning visual decisions into a shared product language. You will audit a live interface, define foundations, build resilient components, and create the rituals that keep the system useful after launch.",
             "outcomes": [
                 "Translate brand and interface decisions into durable design tokens.",
                 "Build accessible component contracts that work across product and engineering.",
                 "Set up contribution, release, and adoption practices for a growing team.",
                 "Measure whether the system is reducing rework and improving consistency.",
             ],
             "sections": [
                 {
                     "title": "Why systems earn trust",
                     "summary": "Start with the product problems a system should solve, and identify the work worth standardising.",
                     "duration_label": "58M",
                     "lessons": [
                         {"title": "From UI inventory to a useful system brief", "duration_label": "14M"},
                         {"title": "Finding high-leverage patterns in a product audit", "duration_label": "16M"},
                         {"title": "A team charter for design and engineering", "duration_label": "15M"},
                         {"title": "Workshop: map your consistency gaps", "duration_label": "13M"},
                     ],
                 },
                 {
                     "title": "Foundations: tokens, type and colour",
                     "summary": "Create a small, expressive set of foundations that can support real interfaces without becoming fragile.",
                     "duration_label": "1H 18M",
                     "lessons": [
                         {"title": "Token architecture: primitive, semantic and component tokens", "duration_label": "20M"},
                         {"title": "Typography scales that preserve hierarchy", "duration_label": "18M"},
                         {"title": "Colour roles, contrast and dark-mode readiness", "duration_label": "22M"},
                         {"title": "Lab: naming foundations people can actually use", "duration_label": "18M"},
                     ],
                 },
                 {
                     "title": "Components with clear contracts",
                     "summary": "Move from one-off screens to flexible components, with states and APIs that hold up in production.",
                     "duration_label": "1H 34M",
                     "lessons": [
                         {"title": "Choosing the first components to standardise", "duration_label": "17M"},
                         {"title": "Anatomy, variants and sensible defaults", "duration_label": "24M"},
                         {"title": "Designing every state: loading, empty and error", "duration_label": "21M"},
                         {"title": "Writing component guidance that removes ambiguity", "duration_label": "17M"},
                         {"title": "Lab: build a composable input pattern", "duration_label": "15M"},
                     ],
                 },
                 {
                     "title": "Accessibility as a design constraint",
                     "summary": "Make inclusive behaviour part of each component’s definition, not a QA pass at the end.",
                     "duration_label": "1H 05M",
                     "lessons": [
                         {"title": "Keyboard and focus patterns", "duration_label": "17M"},
                         {"title": "Labels, semantics and screen-reader context", "duration_label": "19M"},
                         {"title": "Testing the system’s accessible defaults", "duration_label": "16M"},
                         {"title": "Review: fixing common component failures", "duration_label": "13M"},
                     ],
                 },
                 {
                     "title": "Governance without gatekeeping",
                     "summary": "Create a contribution model that lets the system evolve while protecting quality and coherence.",
                     "duration_label": "1H 20M",
                     "lessons": [
                         {"title": "Ownership models for small and scaling teams", "duration_label": "18M"},
                         {"title": "Contribution requests and decision records", "duration_label": "21M"},
                         {"title": "Versioning and release notes people will read", "duration_label": "19M"},
                         {"title": "Making adoption easy in design and code", "duration_label": "22M"},
                     ],
                 },
                 {
                     "title": "Launch, adoption and evolution",
                     "summary": "Ship a focused first release, establish feedback loops, and use evidence to guide what comes next.",
                     "duration_label": "1H 15M",
                     "lessons": [
                         {"title": "Preparing a system launch that changes behaviour", "duration_label": "18M"},
                         {"title": "Measuring adoption, drift and delivery impact", "duration_label": "20M"},
                         {"title": "Roadmaps that balance maintenance and momentum", "duration_label": "19M"},
                         {"title": "Capstone: present your system plan", "duration_label": "18M"},
                     ],
                 },
             ],
         }),
    dict(title="UX Research Without a Budget", instructor="Alicia Fuentes", category="Design",
         level="Beginner", price=39, old_price=69, duration_label="5H 10M", lessons_count=22,
         rating=4.6, reviews_count=780, tags="ux-research,product-design",
         description="Guerrilla research methods that fit a startup timeline — five-user tests, lightweight surveys, and turning findings into decisions fast."),
    dict(title="Product Design Portfolio Masterclass", instructor="Alicia Fuentes", category="Design",
         level="Beginner", price=45, old_price=None, duration_label="6H 00M", lessons_count=24,
         rating=4.7, reviews_count=1102, tags="portfolio,career",
         description="Turn your case studies into a portfolio that gets interviews — narrative structure, process framing, and the details hiring managers look for."),
    dict(title="Interaction Design & Micro-interactions", instructor="Noor Haddad", category="Design",
         level="Intermediate", price=55, old_price=99, duration_label="6H 40M", lessons_count=26,
         rating=4.7, reviews_count=640, tags="interaction-design,motion",
         description="The small moments — transitions, feedback states, empty states — that make a product feel considered instead of assembled."),
    dict(title="Design for Accessibility", instructor="Jonas Weber", category="Design",
         level="Intermediate", price=49, old_price=None, duration_label="5H 55M", lessons_count=22,
         rating=4.8, reviews_count=512, tags="accessibility,a11y",
         description="Build interfaces that actually work for screen readers, keyboard navigation, and low vision — as a design discipline, not a compliance checkbox."),
    dict(title="Figma to Production Handoff", instructor="Jonas Weber", category="Design",
         level="Beginner", price=35, old_price=59, duration_label="4H 30M", lessons_count=18,
         rating=4.5, reviews_count=940, tags="figma,handoff",
         description="Close the gap between design files and shipped code — specs, tokens, and the handoff conventions that stop things getting lost in translation."),
    dict(title="Visual Design Fundamentals", instructor="Clara Jensen", category="Design",
         level="Beginner", price=39, old_price=None, duration_label="5H 15M", lessons_count=20,
         rating=4.6, reviews_count=1760, tags="visual-design,fundamentals",
         description="Typography, color, and layout principles explained with real critique — the foundation every other design skill builds on."),

    # ---- Cybersecurity ----
    dict(title="Application Security Fundamentals", instructor="Yusuf Demir", category="Cybersecurity",
         level="Beginner", price=49, old_price=89, duration_label="6H 20M", lessons_count=26,
         rating=4.7, reviews_count=1330, tags="appsec,owasp",
         description="OWASP Top 10 explained through real exploits you build and fix yourself — SQL injection, XSS, and the rest, hands-on."),
    dict(title="Threat Modeling in Practice", instructor="Yusuf Demir", category="Cybersecurity",
         level="Intermediate", price=65, old_price=None, duration_label="5H 40M", lessons_count=20,
         rating=4.6, reviews_count=480, tags="threat-modeling",
         description="STRIDE, attack trees, and the workshop format that gets a whole team thinking about what could go wrong before it ships."),
    dict(title="Cloud Security Essentials", instructor="Naledi Mokoena", category="Cybersecurity",
         level="Intermediate", price=69, old_price=119, duration_label="7H 50M", lessons_count=28,
         rating=4.7, reviews_count=690, tags="cloud-security,iam",
         description="IAM misconfigurations, exposed storage, and the shared-responsibility gaps that cause most cloud breaches — and how to close them."),
    dict(title="Ethical Hacking & Penetration Testing", instructor="Rahul Mehta", category="Cybersecurity",
         level="Advanced", price=89, old_price=159, duration_label="12H 10M", lessons_count=44,
         rating=4.8, reviews_count=1050, tags="pentesting,ethical-hacking",
         description="Reconnaissance, exploitation, and reporting — a full pentest engagement walked through end to end in a legal lab environment."),
    dict(title="Security for API Backends", instructor="Marcus Reid", category="Cybersecurity",
         level="Intermediate", price=59, old_price=None, duration_label="6H 05M", lessons_count=24,
         rating=4.6, reviews_count=560, tags="api-security",
         description="Rate limiting, input validation, and auth pitfalls specific to APIs — hardening the surface most attackers actually hit first."),
    dict(title="Incident Response Playbooks", instructor="Rahul Mehta", category="Cybersecurity",
         level="Advanced", price=75, old_price=129, duration_label="7H 30M", lessons_count=26,
         rating=4.7, reviews_count=340, tags="incident-response",
         description="Build the runbooks and communication plans that turn a security incident from chaos into a controlled, documented response."),
    dict(title="Cryptography for Developers", instructor="Elena Petrova", category="Cybersecurity",
         level="Intermediate", price=55, old_price=None, duration_label="6H 15M", lessons_count=22,
         rating=4.6, reviews_count=470, tags="cryptography",
         description="Hashing, symmetric/asymmetric encryption, and TLS — enough real cryptographic literacy to stop making the mistakes that break systems."),
]


# A topic-specific learning path for every course in the catalog. Lesson rows and
# timings are generated from these module names so the displayed curriculum stays
# in sync with each product's advertised duration and lesson count.
COURSE_OUTLINES: dict[str, tuple[str, str, str, str]] = {
    "Production LangGraph: Agents That Ship": ("Agent architecture and state", "Tools, memory and handoffs", "Evaluation and observability", "Deployment and operational guardrails"),
    "Evaluating LLM Systems": ("Evaluation strategy and datasets", "Rubrics, graders and human review", "Regression testing and experimentation", "Monitoring quality in production"),
    "Vector Databases in Production": ("Embedding and indexing foundations", "Retrieval design and relevance", "Sync, filtering and operations", "Choosing and shipping a vector store"),
    "Tool Use & Function Calling Deep Dive": ("Reliable tool schemas", "Tool orchestration and parallelism", "Error recovery and guardrails", "Testing tool-enabled agents"),
    "Multi-Agent Systems in Practice": ("Coordination architectures", "Planning, delegation and memory", "Critique loops and failure handling", "Measuring multi-agent performance"),
    "Retrieval Systems that Scale": ("Corpus design and chunking", "Hybrid search and re-ranking", "Metadata, freshness and filtering", "Production retrieval operations"),
    "Prompt Engineering for Engineers": ("Prompt foundations and constraints", "Few-shot patterns and templates", "Structured outputs and tool prompts", "Testing prompts as an engineering system"),
    "Full-Stack Next.js: From Zero to Deployed": ("App Router and component architecture", "Data, forms and server actions", "Authentication and product features", "Testing, deployment and operations"),
    "Advanced React Patterns": ("Component API design", "Reusable state and custom hooks", "Composition and state machines", "Performance and production patterns"),
    "API Design with FastAPI": ("Resource modelling and HTTP semantics", "Validation, errors and documentation", "Pagination, filtering and versioning", "Testing and operating APIs"),
    "TypeScript for Large Codebases": ("Type modelling and narrowing", "Generics and reusable abstractions", "Module boundaries and API contracts", "Migration and maintainability at scale"),
    "Web Performance Engineering": ("Measuring user-centred performance", "Rendering and loading strategy", "JavaScript, assets and caching", "Diagnosing and sustaining improvements"),
    "CSS That Scales: Design Systems in Practice": ("Tokens and styling architecture", "Component styles and variants", "Responsive layouts and accessibility", "Governance and team adoption"),
    "Authentication & Authorization Done Right": ("Identity, sessions and tokens", "Authorization models and permissions", "OAuth, security and threat modelling", "Testing and operating auth systems"),
    "Feature Engineering at Scale": ("Feature discovery and data quality", "Reusable feature pipelines", "Training-serving consistency", "Monitoring drift and feature operations"),
    "Streaming Data Pipelines with Kafka": ("Topics, partitions and consumer groups", "Schema evolution and event design", "Delivery guarantees and recovery", "Operating streaming systems"),
    "Statistics for Data Scientists": ("Probability and sampling intuition", "Estimation and confidence intervals", "Hypothesis tests and interpretation", "Communicating statistical decisions"),
    "Practical Machine Learning with scikit-learn": ("Problem framing and data preparation", "Models, validation and metrics", "Pipelines and feature workflows", "Deployment and model iteration"),
    "Deep Learning Foundations": ("Neural-network building blocks", "Backpropagation and optimisation", "Architectures and regularisation", "Training diagnostics and practical experiments"),
    "Experiment Design & A/B Testing": ("Experiment questions and hypotheses", "Power, metrics and instrumentation", "Running clean experiments", "Reading results and deciding responsibly"),
    "SQL for Analytics at Scale": ("Relational thinking and query structure", "Joins, CTEs and window functions", "Query plans and performance", "Reliable analytics workflows"),
    "Kubernetes in Production": ("Cluster and workload foundations", "Networking, storage and configuration", "Scaling, security and delivery", "Troubleshooting production clusters"),
    "AWS Solutions Architect Bootcamp": ("Core AWS building blocks", "Resilience, networking and identity", "Cost-aware architecture decisions", "Architecture reviews and exam scenarios"),
    "CI/CD Pipelines that Don't Break": ("Pipeline design and quality gates", "Build speed, caching and parallelism", "Safe deployments and rollbacks", "Observability and continuous improvement"),
    "Infrastructure as Code with Terraform": ("Terraform workflow and state", "Reusable modules and environments", "Testing, policy and collaboration", "Drift, delivery and operations"),
    "Observability: Logs, Metrics, and Traces": ("Signals and service context", "Structured logs and useful metrics", "Tracing distributed requests", "Dashboards, alerts and incident response"),
    "Docker Deep Dive": ("Images, layers and build strategy", "Container networking and storage", "Compose and local development", "Security, debugging and delivery"),
    "Site Reliability Engineering Fundamentals": ("Reliability as a product decision", "SLIs, SLOs and error budgets", "Incident response and learning", "Sustainable on-call and improvement"),
    "Design Systems for Product Teams": ("System strategy and interface audits", "Tokens, type and visual foundations", "Components and accessible behaviour", "Governance, adoption and evolution"),
    "UX Research Without a Budget": ("Research questions and lightweight planning", "Interviews, tests and fast evidence", "Synthesising signals into insights", "Sharing findings and changing decisions"),
    "Product Design Portfolio Masterclass": ("Portfolio strategy and story selection", "Case-study narrative and craft", "Presenting process and outcomes", "Feedback, refinement and interview readiness"),
    "Interaction Design & Micro-interactions": ("Interaction principles and feedback", "Motion, timing and state changes", "Designing forms and system feedback", "Prototyping and usability refinement"),
    "Design for Accessibility": ("Inclusive design foundations", "Colour, type and visual access", "Keyboard, screen-reader and interaction patterns", "Testing and embedding accessible practice"),
    "Figma to Production Handoff": ("File structure and design intent", "Tokens, specs and component contracts", "Collaborative handoff workflows", "QA, feedback and design-code parity"),
    "Visual Design Fundamentals": ("Hierarchy, balance and layout", "Typography and readable systems", "Colour, imagery and visual rhythm", "Critique and practical application"),
    "Application Security Fundamentals": ("Threats, trust boundaries and OWASP", "Input handling and common exploits", "Authentication, sessions and secrets", "Security testing and remediation"),
    "Threat Modeling in Practice": ("System mapping and assets", "STRIDE, attack trees and abuse cases", "Prioritising risks and mitigations", "Facilitating threat-model workshops"),
    "Cloud Security Essentials": ("Cloud responsibility and asset discovery", "IAM, credentials and least privilege", "Network, storage and workload protection", "Detection, response and compliance"),
    "Ethical Hacking & Penetration Testing": ("Legal scoping and reconnaissance", "Enumeration and controlled exploitation", "Post-exploitation and evidence", "Reporting and remediation guidance"),
    "Security for API Backends": ("API attack surface and auth", "Validation, rate limits and abuse controls", "Secrets, logging and secure operations", "Testing and hardening an API"),
    "Incident Response Playbooks": ("Preparation and incident roles", "Triage, containment and communication", "Eradication, recovery and evidence", "Post-incident learning and playbooks"),
    "Cryptography for Developers": ("Cryptographic primitives and threat models", "Hashing, encryption and key management", "TLS and secure protocol use", "Avoiding implementation mistakes"),
}

LESSON_STEPS = (
    "Core concepts and terminology",
    "Mental models and decision points",
    "Patterns that work in practice",
    "Guided implementation",
    "Worked example",
    "Hands-on exercise",
    "Testing and validation",
    "Common failure modes",
    "Production considerations",
    "Tooling walkthrough",
    "Case study",
    "Team workflow",
    "Review and exercises",
    "Checkpoint quiz",
    "Capstone milestone",
    "Next steps",
)


def _duration_to_minutes(value: str) -> int:
    hours = 0
    minutes = 0
    for part in value.upper().split():
        if part.endswith("H"):
            hours = int(part[:-1])
        elif part.endswith("M"):
            minutes = int(part[:-1])
    return hours * 60 + minutes


def _format_duration(minutes: int) -> str:
    hours, remainder = divmod(minutes, 60)
    return f"{hours}H {remainder:02d}M" if hours else f"{remainder}M"


def _split_total(total: int, parts: int) -> list[int]:
    base, remainder = divmod(total, parts)
    return [base + (1 if index < remainder else 0) for index in range(parts)]


def build_course_content(course: dict) -> dict:
    outline = COURSE_OUTLINES[course["title"]]
    lesson_distribution = _split_total(course["lessons_count"], len(outline))
    minute_distribution = _split_total(_duration_to_minutes(course["duration_label"]), len(outline))
    sections = []

    for index, (section_title, lesson_count, minutes) in enumerate(
        zip(outline, lesson_distribution, minute_distribution, strict=True)
    ):
        lessons = [
            {
                "title": f"{section_title}: {LESSON_STEPS[lesson_index % len(LESSON_STEPS)]}",
                "duration_label": _format_duration(max(4, minutes // lesson_count)),
            }
            for lesson_index in range(lesson_count)
        ]
        sections.append(
            {
                "title": section_title,
                "summary": f"Build practical judgment around {section_title.lower()} through focused examples, decisions and applied practice.",
                "duration_label": _format_duration(minutes),
                "lessons": lessons,
            }
        )

    return {
        "headline": f"Make {course['title']} a capability your team can rely on.",
        "overview": f"{course['description']} This guided path moves from first principles to applied decisions, so you finish with techniques you can use in real work.",
        "outcomes": [
            f"Build a repeatable approach to {outline[0].lower()}.",
            f"Make sound trade-offs across {outline[1].lower()}.",
            f"Apply {outline[2].lower()} in hands-on project work.",
            f"Leave with a practical playbook for {outline[3].lower()}.",
        ],
        "sections": sections,
    }


def content_for_course(course: dict) -> dict:
    """Keep the hand-authored flagship syllabi while completing their lesson rows."""
    if not course.get("course_content"):
        return build_course_content(course)

    content = deepcopy(course["course_content"])
    content["headline"] = f"Make {course['title']} a capability your team can rely on."
    targets = _split_total(course["lessons_count"], len(content["sections"]))
    for section, target in zip(content["sections"], targets, strict=True):
        while len(section["lessons"]) < target:
            step = LESSON_STEPS[len(section["lessons"]) % len(LESSON_STEPS)]
            section["lessons"].append(
                {
                    "title": f"{section['title']}: {step}",
                    "duration_label": "12M",
                }
            )
    return content


def main():
    Base.metadata.create_all(bind=engine)
    ensure_schema()
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if admin is None:
            admin = User(
                email=ADMIN_EMAIL,
                password_hash=hash_password(ADMIN_PASSWORD),
                role=UserRole.admin,
            )
            db.add(admin)
            db.commit()
            print(f"Created admin user: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
        else:
            print(f"Admin user already exists: {ADMIN_EMAIL}")

        existing_products = {p.title: p for p in db.query(Product).all()}
        created = 0
        updated = 0
        for course in COURSES:
            course_content = content_for_course(course)
            course["course_content"] = course_content
            existing = existing_products.get(course["title"])
            if existing:
                if existing.course_content != course_content:
                    existing.course_content = course_content
                    updated += 1
                continue
            product_service.create_product(db, ProductCreate(**course))
            created += 1
        db.commit()
        print(f"Seeded {created} new courses and updated {updated} course details ({len(COURSES)} total in catalog definition).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
