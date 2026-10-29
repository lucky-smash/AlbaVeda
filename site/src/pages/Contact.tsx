import { useState } from "react";
import { ArrowRight } from "../components/Icons";
import { company, social } from "../data/site";
import { usePageMeta } from "../lib/meta";

export default function Contact() {
  usePageMeta("Contact — Albatross Herbals | Alba | Diva | Saar", `For queries please call ${company.phones[0].number} or mail ${company.email}.`);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const mailto = `mailto:${company.email}?subject=${encodeURIComponent(`Website enquiry — ${form.name}`)}&body=${encodeURIComponent(
    `${form.message}\n\n— ${form.name}${form.email ? ` (${form.email})` : ""}`,
  )}`;

  return (
    <div className="wrap contact">
      <header className="contact__head">
        <p className="eyebrow">Contact</p>
        <h1 className="display">
          Let us know <span className="accent">what you think.</span>
        </h1>
      </header>
      <div className="contact__grid">
        <div className="contact__info">
          <section>
            <h2 className="eyebrow">Write</h2>
            <a className="contact__big" href={`mailto:${company.email}`}>
              {company.email}
            </a>
          </section>
          <section>
            <h2 className="eyebrow">Call</h2>
            <ul role="list">
              {company.phones.map((p) => (
                <li key={p.number}>
                  <span className="meta">{p.label}</span> <a href={`tel:${p.number.replace(/[^+\d]/g, "")}`}>{p.number}</a>
                </li>
              ))}
            </ul>
            <p className="meta">{company.hours}</p>
          </section>
          <section>
            <h2 className="eyebrow">Visit</h2>
            <address>
              {company.legalName}
              {company.address.map((l) => (
                <span key={l}>
                  <br />
                  {l}
                </span>
              ))}
            </address>
          </section>
          <section>
            <h2 className="eyebrow">Follow</h2>
            <p className="contact__social">
              {social.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
              ))}
            </p>
          </section>
        </div>

        <form
          className="form contact__form"
          onSubmit={(e) => {
            e.preventDefault();
            window.location.href = mailto;
          }}
        >
          <p className="meta">This form opens your email app with your message addressed to the Alba team.</p>
          <label className="field">
            <span>Name</span>
            <input required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="field">
            <span>Message</span>
            <textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </label>
          <button className="btn btn--primary" type="submit">
            Write to us <ArrowRight />
          </button>
        </form>
      </div>
    </div>
  );
}
