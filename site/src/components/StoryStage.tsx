import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { categories, getProduct } from "../data/catalog";
import { chapters } from "../data/site";
import { detectStageTier, type StageTier } from "../lib/motion";
import type { BotanicalScene } from "../scene/BotanicalScene";
import { AddToBag } from "./AddToBag";
import { ArrowDown, ArrowRight, Sprig } from "./Icons";
import { Price } from "./Price";

/** The intro plays once per full page load; SPA returns to "/" show the settled scene. */
let introPlayedThisLoad = false;

export function StoryStage() {
  const initialTier = useMemo<StageTier>(() => detectStageTier(), []);
  const [tier, setTier] = useState<StageTier>(initialTier);
  const playIntro = useRef(!introPlayedThisLoad && initialTier !== "static" && window.scrollY < window.innerHeight * 0.4);
  const [introPlaying, setIntroPlaying] = useState(playIntro.current);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(0); // 0 hero, 1..n chapters
  const stageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<BotanicalScene | null>(null);
  const chapterRefs = useRef<(HTMLElement | null)[]>([]);
  const anchors = useRef<number[]>([0]);

  /* ---- scroll → story position (piecewise-linear between section centres) */
  const measure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const vh = window.innerHeight;
    const stageTop = stage.getBoundingClientRect().top + window.scrollY;
    anchors.current = [
      stageTop,
      ...chapterRefs.current.map((el) => {
        if (!el) return stageTop;
        const r = el.getBoundingClientRect();
        return r.top + window.scrollY + r.height / 2 - vh / 2;
      }),
    ];
  }, []);

  const storyAt = useCallback((y: number) => {
    const a = anchors.current;
    if (y <= a[0]) return 0;
    for (let i = 0; i < a.length - 1; i++) {
      if (y <= a[i + 1]) return i + (y - a[i]) / Math.max(1, a[i + 1] - a[i]);
    }
    return a.length - 1;
  }, []);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const f = storyAt(window.scrollY);
      sceneRef.current?.setStory(f);
      setActive(Math.round(f));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onResize = () => {
      measure();
      onScroll();
    };
    measure();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    // Fonts and lazy images change section heights after first paint.
    const ro = new ResizeObserver(onResize);
    if (stageRef.current) ro.observe(stageRef.current);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, [measure, storyAt]);

  /* ---- 3D scene lifecycle */
  useEffect(() => {
    if (tier === "static") {
      setIntroPlaying(false);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let scene: BotanicalScene | null = null;
    const cleanups: (() => void)[] = [];

    import("../scene/BotanicalScene")
      .then(({ BotanicalScene }) => {
        if (cancelled) return;
        try {
          scene = new BotanicalScene({
            canvas,
            tier,
            packs: chapters.map((c) => ({ url: c.pack, halo: c.halo, tint: c.tint })),
            playIntro: playIntro.current,
            onFirstFrame: () => setReady(true),
            onIntroDone: () => setIntroPlaying(false),
            onFail: () => setTier("static"),
          });
        } catch {
          setTier("static");
          return;
        }
        introPlayedThisLoad = true;
        sceneRef.current = scene;
        const sizeTo = () => scene?.resize(canvas.clientWidth, canvas.clientHeight);
        sizeTo();
        scene.setStory(storyAt(window.scrollY));

        const ro = new ResizeObserver(sizeTo);
        ro.observe(canvas);
        cleanups.push(() => ro.disconnect());

        // Only render while the stage is on screen and the tab is visible.
        let onScreen = true;
        const sync = () => (onScreen && !document.hidden ? scene?.start() : scene?.stop());
        const io = new IntersectionObserver(([e]) => {
          onScreen = e.isIntersecting;
          sync();
        });
        io.observe(stageRef.current!);
        document.addEventListener("visibilitychange", sync);
        cleanups.push(() => {
          io.disconnect();
          document.removeEventListener("visibilitychange", sync);
        });
        sync();

        if (window.matchMedia("(pointer: fine)").matches) {
          const onMove = (e: PointerEvent) =>
            scene?.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
          window.addEventListener("pointermove", onMove, { passive: true });
          cleanups.push(() => window.removeEventListener("pointermove", onMove));
        }
      })
      .catch(() => !cancelled && setTier("static"));

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
      scene?.dispose();
      sceneRef.current = null;
    };
  }, [tier, storyAt]);

  const skip = () => {
    sceneRef.current?.skipIntro();
  };

  const isStatic = tier === "static";

  return (
    <section className="stage" data-header="dark" ref={stageRef} data-tier={tier} aria-label="Alba — from the earth to your everyday">
      <div className="stage__sticky" aria-hidden>
        {isStatic ? (
          <StaticVisual active={active} />
        ) : (
          <canvas ref={canvasRef} className="stage__canvas" data-ready={ready} />
        )}
        <div className="stage__shade" />
      </div>

      <div className="stage__flow">
        <header className="hero" data-intro={introPlaying ? "playing" : "done"}>
          <div className="wrap hero__inner">
            <div className="hero__copy">
              <p className="eyebrow hero__eyebrow hero-in" style={{ "--d": 0 } as React.CSSProperties}>
                Ayurvedic · Herbal · Natural <span aria-hidden>—</span> since 1991
              </p>
              <h1 className="display hero__title hero-in" style={{ "--d": 1 } as React.CSSProperties}>
                The goodness of herbs, <span className="accent">straight from the earth.</span>
              </h1>
              <p className="hero__lead hero-in" style={{ "--d": 2 } as React.CSSProperties}>
                100% natural Ayurvedic powders for skin, hair, beauty and wellness, and Diva essentials for pooja — made by Albatross
                Herbals.
              </p>
              <div className="hero__ctas hero-in" style={{ "--d": 3 } as React.CSSProperties}>
                <Link to="/shop" className="btn btn--primary">
                  Shop all products <ArrowRight />
                </Link>
                <a href="#categories" className="btn btn--ghost">
                  Browse categories
                </a>
              </div>
              <nav className="hero__cats hero-in" aria-label="Shop by category" style={{ "--d": 4 } as React.CSSProperties}>
                {categories.map((c) => (
                  <Link key={c.id} to={`/${c.id}`}>
                    {c.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
          <div className="hero__foot wrap">
            <p className="hero__hint">
              <ArrowDown /> Scroll — from leaf to pack
            </p>
            <button type="button" className="skip-intro" onClick={skip} data-visible={introPlaying} tabIndex={introPlaying ? 0 : -1}>
              Skip intro
            </button>
          </div>
        </header>

        {chapters.map((c, i) => {
          const product = getProduct(c.productId)!;
          const v = product.variants[0];
          return (
            <article
              key={c.productId}
              className="chapter"
              ref={(el) => {
                chapterRefs.current[i] = el;
              }}
              aria-labelledby={`chapter-${i}`}
              data-active={active === i + 1}
            >
              <div className="wrap chapter__inner">
                <div className="chapter__card">
                  <p className="eyebrow chapter__kicker">
                    <span className="chapter__num">0{i + 1}</span> {c.kicker}
                  </p>
                  <p className="deva chapter__deva" lang="hi">
                    {c.deva}
                  </p>
                  <h2 id={`chapter-${i}`} className="h1 chapter__title">
                    {c.title}
                  </h2>
                  <blockquote className="chapter__quote">
                    <p>“{c.quote}”</p>
                  </blockquote>
                  <div className="chapter__buy">
                    <div>
                      <Link to={`/product/${product.id}`} className="chapter__pname">
                        {product.name}
                        {v.label ? <span className="meta-dark"> · {v.label}</span> : null}
                      </Link>
                      <Price price={v.price} compareAt={v.compareAt} />
                    </div>
                    <AddToBag variantId={v.id} name={product.name} className="btn btn--primary" label="Add" />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/** Reduced-motion / no-WebGL presentation: the same real packs, layered in 2.5D, crossfading per chapter. */
function StaticVisual({ active }: { active: number }) {
  const shown = Math.max(0, active - 1);
  return (
    <div className="static-stage">
      <div className="static-stage__glow" style={{ background: chapters[shown].halo }} />
      <Sprig className="static-stage__sprig static-stage__sprig--a" />
      <Sprig className="static-stage__sprig static-stage__sprig--b" />
      <div className="static-stage__soil" />
      {chapters.map((c, i) => (
        <img
          key={c.pack}
          src={c.pack}
          alt=""
          className="static-stage__pack"
          data-shown={i === shown}
          width={640}
          height={1024}
          crossOrigin="anonymous"
          fetchPriority={i === 0 ? "high" : "low"}
          loading={i === 0 ? "eager" : "lazy"}
        />
      ))}
    </div>
  );
}
