"""Seed the Growise catalog with realistic courses (dual-written to SQLite + Chroma)
and create a default admin account.

Run with: python seed.py
"""

from app.auth import hash_password
from app.database import Base, SessionLocal, engine
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
         description="SLOs, error budgets, and incident response — the SRE practices that turn uptime into an engineering discipline instead of a hope."),

    # ---- Design ----
    dict(title="Design Systems for Product Teams", instructor="Noor Haddad", category="Design",
         level="Intermediate", price=59, old_price=None, duration_label="7H 30M", lessons_count=31,
         rating=4.8, reviews_count=1540, tags="design-systems,ui",
         description="Build a design system that a growing team actually adopts — tokens, component contracts, and the governance that keeps it from rotting."),
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


def main():
    Base.metadata.create_all(bind=engine)
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

        existing_titles = {p.title for p in db.query(Product.title).all()}
        created = 0
        for course in COURSES:
            if course["title"] in existing_titles:
                continue
            product_service.create_product(db, ProductCreate(**course))
            created += 1
        print(f"Seeded {created} new courses ({len(COURSES)} total in catalog definition).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
