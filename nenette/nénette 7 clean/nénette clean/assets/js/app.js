import { navigate } from "./router.js";

window.addEventListener("DOMContentLoaded", async () => {
  document.querySelectorAll("#nav button").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.route));
  });

  document.getElementById("refresh").addEventListener("click", () => navigate("dashboard"));
  document.getElementById("wallet").addEventListener("click", () => navigate("portfolio"));


  const mobileMenu = document.getElementById("mobile-menu");
  const sidebar = document.querySelector(".sidebar");

  if (mobileMenu && sidebar) {
    mobileMenu.addEventListener("click", () => {
      sidebar.classList.toggle("mobile-open");
      mobileMenu.classList.toggle("active");
    });

    document.querySelectorAll("#nav button").forEach(button => {
      button.addEventListener("click", () => {
        sidebar.classList.remove("mobile-open");
        mobileMenu.classList.remove("active");
      });
    });

    document.addEventListener("click", event => {
      const clickInsideSidebar = sidebar.contains(event.target);
      const clickOnMenu = mobileMenu.contains(event.target);
      if (!clickInsideSidebar && !clickOnMenu) {
        sidebar.classList.remove("mobile-open");
        mobileMenu.classList.remove("active");
      }
    });
  }

  await navigate("dashboard");
});
