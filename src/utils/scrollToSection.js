let activeScrollSession = 0;

export function scrollToSection(id, { behavior = "smooth" } = {}) {
  const session = ++activeScrollSession;

  function scrollToElement(element) {
    if (session !== activeScrollSession) {
      return;
    }
    element.scrollIntoView({ behavior, block: "start" });
  }

  function cleanup(observer, timeoutId) {
    observer?.disconnect();
    clearTimeout(timeoutId);
  }

  const existing = document.getElementById(id);
  if (existing) {
    scrollToElement(existing);
    return;
  }

  let settled = false;

  function settle(element, observer, timeoutId) {
    if (settled || session !== activeScrollSession) {
      cleanup(observer, timeoutId);
      return;
    }
    settled = true;
    cleanup(observer, timeoutId);
    scrollToElement(element);
  }

  const observer = new MutationObserver(() => {
    const element = document.getElementById(id);
    if (element) {
      settle(element, observer, timeoutId);
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  const timeoutId = setTimeout(() => {
    settled = true;
    cleanup(observer, timeoutId);
  }, 10000);
}

export function navigateToSection(hash, { pathname = window.location.pathname } = {}) {
  const id = hash === "home" ? "home" : hash;

  if (hash === "home") {
    if (window.location.hash) {
      history.pushState(null, "", pathname);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  } else {
    const nextHash = `#${hash}`;
    if (window.location.hash !== nextHash) {
      history.pushState(null, "", `${pathname}${nextHash}`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  }

  scrollToSection(id);
}
