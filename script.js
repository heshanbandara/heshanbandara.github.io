(() => {
  "use strict";

  const root = document.documentElement;
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  let userPaused = false;

  try {
    userPaused = localStorage.getItem("portfolio-motion") === "paused";
  } catch {
    // The site still works if browser storage is unavailable.
  }

  const isMotionPaused = () => userPaused || reducedMotion.matches;

  // Current year
  document.querySelectorAll("[data-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  // Mobile navigation
  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".main-nav");

  if (menuButton && navigation) {
    root.classList.add("nav-enhanced");
    menuButton.hidden = false;

    const closeMenu = () => {
      navigation.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Open navigation");
      menuButton.textContent = "☰";
    };

    menuButton.addEventListener("click", () => {
      const open = navigation.classList.toggle("is-open");

      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute(
        "aria-label",
        open ? "Close navigation" : "Open navigation"
      );

      menuButton.textContent = open ? "✕" : "☰";
    });

    navigation.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        const wasOpen = navigation.classList.contains("is-open");
        closeMenu();

        if (wasOpen) menuButton.focus();
      }
    });

    window.matchMedia("(min-width: 701px)").addEventListener(
      "change",
      closeMenu
    );
  }

  // Motion preference
  const motionButton = document.querySelector(".motion-toggle");

  const updateMotion = () => {
    const paused = isMotionPaused();

    root.classList.toggle("motion-paused", paused);

    if (!motionButton) return;

    motionButton.setAttribute("aria-pressed", String(paused));
    motionButton.disabled = reducedMotion.matches;

    motionButton.textContent = reducedMotion.matches
      ? "Reduced motion enabled"
      : paused
        ? "Resume animations"
        : "Pause animations";
  };

  if (motionButton) {
    motionButton.hidden = false;

    motionButton.addEventListener("click", () => {
      userPaused = !userPaused;

      try {
        localStorage.setItem(
          "portfolio-motion",
          userPaused ? "paused" : "playing"
        );
      } catch {
        // Keep the preference for this page visit only.
      }

      updateMotion();
    });
  }

  reducedMotion.addEventListener("change", updateMotion);
  updateMotion();

  // Scroll reveal: enable only after the observer is available.
  const revealElements = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window && !isMotionPaused()) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.08 }
    );

    root.classList.add("motion-ready");

    revealElements.forEach((element) => {
      revealObserver.observe(element);
    });
  }

  // Reading progress
  const progressBar = document.querySelector(".scroll-progress");
  let progressScheduled = false;

  const updateProgress = () => {
    const scrollableHeight = root.scrollHeight - window.innerHeight;

    const progress = scrollableHeight > 0
      ? Math.min(1, Math.max(0, window.scrollY / scrollableHeight))
      : 0;

    if (progressBar) {
      progressBar.style.transform = `scaleX(${progress})`;
    }

    progressScheduled = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (progressScheduled) return;

      progressScheduled = true;
      requestAnimationFrame(updateProgress);
    },
    { passive: true }
  );

  window.addEventListener("resize", updateProgress);
  updateProgress();

  // Project filtering
  const filterBar = document.querySelector(".project-filters");
  const filterButtons = document.querySelectorAll("[data-filter]");
  const projectCards = document.querySelectorAll("[data-category]");
  const filterStatus = document.querySelector("#filter-status");

  if (filterBar && projectCards.length) {
    filterBar.hidden = false;

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const selectedCategory = button.dataset.filter;
        let visibleCount = 0;

        filterButtons.forEach((filterButton) => {
          filterButton.setAttribute(
            "aria-pressed",
            String(filterButton === button)
          );
        });

        projectCards.forEach((card) => {
          const visible =
            selectedCategory === "all" ||
            card.dataset.category === selectedCategory;

          card.hidden = !visible;

          if (!visible) return;

          visibleCount += 1;
          card.classList.add("is-visible");

          if (!isMotionPaused() && typeof card.animate === "function") {
            card.animate(
              [
                { opacity: 0, transform: "translateY(14px)" },
                { opacity: 1, transform: "translateY(0)" }
              ],
              {
                duration: 350,
                easing: "ease-out"
              }
            );
          }
        });

        if (filterStatus) {
          filterStatus.textContent =
            `${visibleCount} project${visibleCount === 1 ? "" : "s"} shown.`;
        }

        updateProgress();
      });
    });
  }

  document.querySelectorAll("details").forEach((details) => {
    details.addEventListener("toggle", updateProgress);
  });
})();



async function initGitHubActivity() {
  const canvas = document.getElementById("githubRadar");
  const stats = document.getElementById("activity-stats");
  const total = document.getElementById("activity-total");
  const updated = document.getElementById("activity-updated");

  if (!canvas || !stats || !total || !updated) return;

  try {
    const response = await fetch("./activity.json", {
      cache: "no-cache"
    });

    if (!response.ok) {
      throw new Error("Activity data unavailable");
    }

    const data = await response.json();

    const labels = [
      "Code Reviews",
      "Issues",
      "Pull Requests",
      "Commits"
    ];

    const values = [
      data.reviews,
      data.issues,
      data.pullRequests,
      data.commits
    ];

    if (!values.every(v =>
      Number.isFinite(v) && v >= 0
    )) {
      throw new Error("Invalid activity data");
    }

    const sum = values.reduce((a, b) => a + b, 0);

    const percentages = values.map(value =>
      sum ? Math.round(value / sum * 100) : 0
    );

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const duration = reducedMotion ? 0 : 1800;

    total.textContent = `${sum} tracked contributions`;

    updated.textContent =
      "Last 12 months · Updated: " +
      new Date(data.updatedAt).toLocaleDateString();

    stats.innerHTML = "";

    labels.forEach((label, i) => {
      const row = document.createElement("div");
      row.className = "activity-stat";

      const name = document.createElement("span");
      name.textContent = label;

      const count = document.createElement("strong");
      count.dataset.value = percentages[i];
      count.textContent = "0%";

      row.append(name, count);
      stats.append(row);
    });

    function animateCounters() {
      const start = performance.now();

      function frame(now) {
        const progress = duration
          ? Math.min((now - start) / duration, 1)
          : 1;

        const eased = 1 - Math.pow(1 - progress, 3);

        stats.querySelectorAll("[data-value]")
          .forEach(element => {
            const value = Number(element.dataset.value);
            element.textContent =
              Math.round(value * eased) + "%";
          });

        if (progress < 1) requestAnimationFrame(frame);
      }

      requestAnimationFrame(frame);
    }

    function renderChart() {
      if (typeof Chart === "undefined") return;

      const chart = new Chart(canvas, {
        type: "radar",

        data: {
          labels,
          datasets: [{
            label: "GitHub Activity (%)",
            data: [0, 0, 0, 0],
            backgroundColor: "rgba(216,250,118,0.18)",
            borderColor: "#d8fa76",
            borderWidth: 2,
            pointBackgroundColor: "#d8fa76",
            pointBorderColor: "#ffffff",
            pointRadius: 5,
            pointHoverRadius: 9
          }]
        },

        options: {
          responsive: true,

          animation: {
            duration,
            easing: "easeOutQuart"
          },

          scales: {
            r: {
              min: 0,
              max: 100,

              grid: {
                color: "#34382c"
              },

              angleLines: {
                color: "#34382c"
              },

              ticks: {
                display: false,
                stepSize: 25
              },

              pointLabels: {
                color: "#c4c9bb",
                font: {
                  size: 12
                }
              }
            }
          },

          plugins: {
            legend: {
              display: false
            },

            tooltip: {
              callbacks: {
                label: context =>
                  `${context.raw}% (${values[context.dataIndex]} contributions)`
              }
            }
          }
        }
      });

      chart.data.datasets[0].data = percentages;
      chart.update();
    }

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        animateCounters();
        renderChart();
        observer.disconnect();
      }
    }, { threshold: 0.15 });

    observer.observe(
      document.querySelector(".activity-dashboard")
    );

  } catch (error) {
    console.error(error);
    total.textContent = "GitHub activity is currently unavailable.";
  }
}

document.addEventListener(
  "DOMContentLoaded",
  initGitHubActivity
);
