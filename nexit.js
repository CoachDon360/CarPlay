const purposeContent = {
  restroom: {
    title: "Restroom selected",
    copy:
      "The next phase will show the next two or three highest-quality restroom stops ahead on the interstate."
  },
  food: {
    title: "Food selected",
    copy:
      "The next phase will rank upcoming interstate exits using strong restaurant and shopping signals."
  },
  superchargers: {
    title: "Superchargers selected",
    copy:
      "The next phase will compare upcoming Supercharger stops by nearby food, restrooms, and shopping."
  }
};

const cards = document.querySelectorAll("[data-purpose]");
const title = document.getElementById("selection-title");
const copy = document.getElementById("selection-copy");

cards.forEach((card) => {
  card.addEventListener("click", () => {
    cards.forEach((item) => item.classList.remove("active"));
    card.classList.add("active");

    const selected = purposeContent[card.dataset.purpose];
    title.textContent = selected.title;
    copy.textContent = selected.copy;
  });
});
