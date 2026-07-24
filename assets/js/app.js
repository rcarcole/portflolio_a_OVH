document.addEventListener("DOMContentLoaded", function () {
	const topMenu = document.getElementById("mainNav");
	const topMenuHeight = topMenu.offsetHeight;
	const menuItems = topMenu.querySelectorAll("a");
	const removeActiveClass = () => {
		menuItems.forEach((item) => {
			item.classList.remove("active");
			item.style.backgroundColor = "";
		});
	};

	menuItems.forEach((item) => {
		item.addEventListener("click", function (e) {
			const href = this.getAttribute("href");
			if (href.charAt(0) === "#") {
				const section = document.querySelector(href);
				if (section) {
					const offsetTop = section.offsetTop - topMenuHeight;
					window.scrollTo({
						top: offsetTop,
						behavior: "smooth",
					});
					setTimeout(() => {
						removeActiveClass();
						this.classList.add("active");
					}, 800);
					e.preventDefault();
				}
			}
		});
	});

	window.addEventListener("scroll", () => {
		const fromTop = window.pageYOffset;
		let currentSection = null;
			Array.from(menuItems).forEach((item) => {
			const href = item.getAttribute("href");
			if (href.charAt(0) === "#") {
				const section = document.querySelector(href);
				if (section && section.offsetTop <= fromTop && section.offsetTop + section.offsetHeight > fromTop) {
					currentSection = item;
				}
			}
		});
	
		if (currentSection) {
			removeActiveClass();
			currentSection.classList.add("active");
		}
	
		let posicion = fromTop * 0.50;
		const home = document.getElementById("home");
		const trabajoFormacion = document.getElementById("trabajosFormacion");
		const redesSociales = document.getElementById("redesSociales");
		const habilidades = document.getElementById("habilidades");
		const proyectos = document.getElementById("proyectos");
	
		if(home) home.style.backgroundPosition = '0 ' + (-posicion) + 'px';
		if(trabajoFormacion) trabajoFormacion.style.backgroundPosition = '0 ' + (-posicion) + 'px';
		if(redesSociales) redesSociales.style.backgroundPosition = '0 ' + (-posicion) + 'px';
		if(habilidades) habilidades.style.backgroundPosition = '0 ' + posicion + 'px';
		if(proyectos) proyectos.style.backgroundPosition = '0 ' + posicion + 'px';
	});
	

});
