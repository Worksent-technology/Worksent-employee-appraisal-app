import Link from "next/link";

const objectives = [
  "Recognize top-performing employees.",
  "Encourage high-quality service delivery.",
  "Reward ownership and accountability.",
  "Promote continuous improvement.",
  "Create transparency in recognition decisions.",
  "Support fair increment and promotion discussions.",
  "Reduce evaluation bias.",
];

const principles = [
  {
    title: "4.1 Performance Over Volume",
    body: "Employees are not evaluated solely on quantity of work completed. Evaluation considers quality of work, achievement against assigned workload, SLA performance, technical competency, business impact, and customer experience. Raw ticket, call, or incident volume does not independently determine ratings.",
  },
  {
    title: "4.2 Fairness Across Shifts",
    body: "Since operational teams work across multiple shifts, evaluations consider the entire evaluation period rather than individual shifts. Employees are not disadvantaged by lower workload opportunities during specific shifts.",
  },
  {
    title: "4.3 Data-Based Evaluation",
    body: "Wherever possible, evaluations are supported by QA audits, ticketing system reports, SLA reports, customer feedback, attendance records, and performance dashboards.",
  },
  {
    title: "4.4 Calibration & Bias Control",
    body: "Final results are reviewed by Management to ensure fairness, consistency, objectivity, and alignment with business expectations.",
  },
];

const eligibility = [
  {
    title: "Service Requirement",
    body: "Minimum 60 days of service during the evaluation quarter.",
  },
  {
    title: "Attendance Requirement",
    body: "Minimum 95% attendance during the quarter.",
  },
  {
    title: "Conduct Requirement",
    body: "No active disciplinary action. No active Performance Improvement Plan (PIP).",
  },
  {
    title: "Employment Status",
    body: "Must be an active employee during winner announcement.",
  },
];

const roles = [
  {
    title: "HR Team",
    items: [
      "Initiating the evaluation cycle",
      "Communicating timelines",
      "Sharing evaluation templates",
      "Validating employee eligibility",
      "Collecting scorecards",
      "Calculating final scores",
      "Conducting calibration meetings",
      "Maintaining records",
      "Announcing winners",
    ],
  },
  {
    title: "QA Team",
    items: [
      "Performing QA evaluations",
      "Maintaining evaluation evidence",
      "Submitting completed scorecards",
      "Providing supporting data where required",
    ],
  },
  {
    title: "Managers & Team Leads",
    items: [
      "Completing Manager evaluations",
      "Providing performance justification",
      "Assessing business impact",
      "Participating in calibration reviews",
    ],
  },
  {
    title: "Management Team",
    items: [
      "Reviewing final recommendations",
      "Resolving tie situations",
      "Approving winners",
      "Approving promotion-related recommendations",
    ],
  },
];

const workflow = [
  "HR announces evaluation cycle.",
  "HR shares timelines and evaluation templates.",
  "QA completes QA evaluations.",
  "Managers and Leads complete performance evaluations.",
  "HR completes compliance evaluations.",
  "HR validates eligibility requirements.",
  "HR calculates weighted scores.",
  "Calibration meeting is conducted.",
  "Management reviews recommendations.",
  "Winners are finalized.",
  "Results are announced.",
  "Records are archived.",
];

const weightage = [
  { area: "QA Performance Evaluation", weight: "50%" },
  { area: "Manager / Lead Evaluation", weight: "35%" },
  { area: "HR Compliance Evaluation", weight: "15%" },
];

const ratingScale = [
  { rating: "Outstanding", score: 5 },
  { rating: "Exceeds Expectations", score: 4 },
  { rating: "Meets Expectations", score: 3 },
  { rating: "Needs Improvement", score: 2 },
  { rating: "Unsatisfactory", score: 1 },
];

const ratingBands = [
  { range: "90 – 100", rating: "Outstanding" },
  { range: "85 – 89", rating: "Exceeds Expectations" },
  { range: "75 – 84", rating: "Strong Performer" },
  { range: "Below 75", rating: "Needs Improvement" },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="mx-auto max-w-5xl px-6 py-12 border-t border-black/5 first:border-t-0"
    >
      <h2 className="text-xl font-semibold tracking-tight mb-6">{title}</h2>
      {children}
    </section>
  );
}

export default function Home() {
  return (
    <div>
      <div className="mx-auto max-w-5xl px-6 pt-16 pb-10">
        <p className="text-sm font-medium text-indigo-600 mb-3">
          Version 1.0 · Owner: HR Department · Approved By: Management
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
          Best Employee Recognition &amp; Performance Excellence Process
        </h1>
        <p className="text-neutral-600 max-w-3xl mb-8">
          A standardized, fair, transparent, and objective framework for
          recognizing outstanding employees across departments and supporting
          employee recognition, performance rewards, increment discussions, and
          promotion readiness assessments.
        </p>
        <Link
          href="/calculator"
          className="inline-flex items-center rounded-md bg-accent text-white px-4 py-2.5 text-sm font-medium hover:bg-accent-dark"
        >
          Open Score Calculator →
        </Link>
      </div>

      <Section id="scope" title="Scope">
        <p className="text-neutral-700 mb-3">This process applies to:</p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700 mb-4">
          <li>Helpdesk Team</li>
          <li>NOC Team</li>
          <li>Dedicated Teams</li>
          <li>Any future operational team approved by Management</li>
        </ul>
        <p className="text-neutral-700">
          Evaluations are conducted quarterly. One winner is selected from each
          department during every evaluation cycle.
        </p>
      </Section>

      <Section id="objectives" title="Objectives">
        <ul className="grid sm:grid-cols-2 gap-3">
          {objectives.map((o) => (
            <li
              key={o}
              className="rounded-lg border border-black/10 px-4 py-3 text-sm text-neutral-700"
            >
              {o}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="principles" title="Guiding Principles">
        <div className="grid sm:grid-cols-2 gap-4">
          {principles.map((p) => (
            <div
              key={p.title}
              className="rounded-lg border border-black/10 p-4"
            >
              <h3 className="font-medium mb-1.5">{p.title}</h3>
              <p className="text-sm text-neutral-600">{p.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="eligibility" title="Eligibility Criteria">
        <p className="text-neutral-700 mb-4">
          Employees must meet all of the following conditions. Failing any
          requirement excludes an employee from consideration.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {eligibility.map((e) => (
            <div
              key={e.title}
              className="rounded-lg border border-black/10 p-4"
            >
              <h3 className="font-medium mb-1.5">{e.title}</h3>
              <p className="text-sm text-neutral-600">{e.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="roles" title="Roles & Responsibilities">
        <div className="grid sm:grid-cols-2 gap-4">
          {roles.map((r) => (
            <div
              key={r.title}
              className="rounded-lg border border-black/10 p-4"
            >
              <h3 className="font-medium mb-2">{r.title}</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-neutral-600">
                {r.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section id="workflow" title="Evaluation Workflow">
        <ol className="space-y-2">
          {workflow.map((w, idx) => (
            <li key={w} className="flex gap-3 text-sm text-neutral-700">
              <span className="flex-none w-6 h-6 rounded-full bg-accent text-white text-xs font-medium flex items-center justify-center">
                {idx + 1}
              </span>
              <span className="pt-0.5">{w}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="weightage" title="Evaluation Weightage">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-black/10 text-left">
              <th className="py-2 pr-4 font-medium">Evaluation Area</th>
              <th className="py-2 font-medium">Weight</th>
            </tr>
          </thead>
          <tbody>
            {weightage.map((w) => (
              <tr key={w.area} className="border-b border-black/5">
                <td className="py-2 pr-4 text-neutral-700">{w.area}</td>
                <td className="py-2 text-neutral-700">{w.weight}</td>
              </tr>
            ))}
            <tr>
              <td className="py-2 pr-4 font-medium">Total</td>
              <td className="py-2 font-medium">100%</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="rating-scale" title="Rating Scale">
        <div className="grid sm:grid-cols-2 gap-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-black/10 text-left">
                <th className="py-2 pr-4 font-medium">Rating</th>
                <th className="py-2 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {ratingScale.map((r) => (
                <tr key={r.rating} className="border-b border-black/5">
                  <td className="py-2 pr-4 text-neutral-700">{r.rating}</td>
                  <td className="py-2 text-neutral-700">{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-black/10 text-left">
                <th className="py-2 pr-4 font-medium">Final Score</th>
                <th className="py-2 font-medium">Performance Rating</th>
              </tr>
            </thead>
            <tbody>
              {ratingBands.map((r) => (
                <tr key={r.range} className="border-b border-black/5">
                  <td className="py-2 pr-4 text-neutral-700">{r.range}</td>
                  <td className="py-2 text-neutral-700">{r.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-neutral-500 mt-3">
          Managers must provide comments for ratings of 5 (Outstanding) or 1
          (Unsatisfactory).
        </p>
      </Section>

      <Section id="recognition" title="Recognition">
        <p className="text-neutral-700 mb-3">
          Minimum qualifying score for the Best Employee Award:{" "}
          <strong>85%</strong>. Winners may receive:
        </p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li>Certificate of Excellence</li>
          <li>Monetary Reward</li>
          <li>Company-wide Recognition</li>
          <li>Leadership Acknowledgement</li>
          <li>Consideration during increment and promotion discussions</li>
        </ul>
      </Section>

      <div className="mx-auto max-w-5xl px-6 pb-16">
        <Link
          href="/calculator"
          className="inline-flex items-center rounded-md bg-accent text-white px-4 py-2.5 text-sm font-medium hover:bg-accent-dark"
        >
          Calculate a score →
        </Link>
      </div>
    </div>
  );
}