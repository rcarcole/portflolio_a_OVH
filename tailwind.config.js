module.exports = {
	content: ["./node_modules/flowbite/**/*.js"],
	theme: {
		extend: {
			margin: {
				18: "4.5rem",
			},
			colors: {
				primary: "#ff0000",
				secondary: "#00ff00",
			},
		},
	},
	variants: {},
	plugins: [require("flowbite/plugin")],
};
