import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function TextReveal({ delay = 0 }: { delay?: number }) {
  const containerRef = useRef<HTMLHeadingElement>(null);

  // Split the text into words, but preserve the HTML structure (like <br/> or <em>)
  // For simplicity since we have HTML tags in our Hero, we'll implement a custom split
  // actually, since we just have a simple string, wait, the Hero title has <br/> and <em>.
  // It's:
  // Inventaris lab,<br/>
  // <em>hidup</em> dari draf hingga gudang.
  // Let's make TextReveal accept children, and we just animate all text nodes.
  // Using GSAP's SplitText is paid, so we write a custom split logic or just animate opacity of words.

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // A simple text split logic:
    // We wrap every word in a span. Since we are passing raw strings and basic elements,
    // let's just do a simple GSAP fromTo on the container's child elements if we structure it right.
    const words = el.querySelectorAll('.reveal-word');

    gsap.fromTo(
      words,
      { y: 20, opacity: 0, filter: 'blur(8px)' },
      {
        y: 0,
        opacity: 1,
        filter: 'blur(0px)',
        duration: 0.8,
        stagger: 0.08,
        ease: 'power3.out',
        delay: delay,
      }
    );
  }, [delay]);

  return (
    <h1
      ref={containerRef}
      className="au-h1 flex flex-wrap justify-center gap-x-[12px] gap-y-[4px] leading-tight"
    >
      {/* Manual split to preserve <em> and <br/> */}
      <span className="reveal-word inline-block">Inventaris</span>
      <span className="reveal-word inline-block">lab,</span>
      <div className="w-full h-0"></div> {/* Line break equivalent */}
      <em className="reveal-word inline-block au-h1-em">hidup</em>
      <span className="reveal-word inline-block">dari</span>
      <span className="reveal-word inline-block">draf</span>
      <span className="reveal-word inline-block">hingga</span>
      <span className="reveal-word inline-block">gudang.</span>
    </h1>
  );
}
