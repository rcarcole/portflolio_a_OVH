document.addEventListener("DOMContentLoaded", function () {
    let ingreso = document.getElementById("ingreso");
    let necesidades = document.getElementById("necesidades");
    let deseos = document.getElementById("deseos");
    let ahorro = document.getElementById("ahorro");

    ingreso.addEventListener("input", function () {
        let ingresoValor = parseFloat(ingreso.value) || 0;
        necesidades.value = (ingresoValor * 0.5).toFixed(2);
        deseos.value = (ingresoValor * 0.3).toFixed(2);
        ahorro.value = (ingresoValor * 0.2).toFixed(2);
        calcularResto();
    });

    let alquiler = document.getElementById("alquiler");
    let servicios = document.getElementById("servicios");
    let alimentacion = document.getElementById("alimentacion");
    let transporte = document.getElementById("transporte");

    function calcularResto() {
        let totalNecesidades = parseFloat(necesidades.value) || 0;
        let gastosNecesidades =
            (parseFloat(alquiler.value) || 0) +
            (parseFloat(servicios.value) || 0) +
            (parseFloat(alimentacion.value) || 0) +
            (parseFloat(transporte.value) || 0);

        let restoNecesidadesValor = totalNecesidades - gastosNecesidades;
        document.getElementById("restoNecesidades").value =
            restoNecesidadesValor.toFixed(2);
        numNegativo(document.getElementById("restoNecesidades"));
    }

    [alquiler, servicios, alimentacion, transporte].forEach((input) => {
        input.addEventListener("input", calcularResto);
    });

    let cena = document.getElementById("cena");
    let cine = document.getElementById("cine");
    let gym = document.getElementById("gym");
    let streaming = document.getElementById("streaming");
    let ropa = document.getElementById("ropa");
    let viajes = document.getElementById("viajes");

    function calcularRestoDeseos() {
        let totalDeseos = parseFloat(deseos.value) || 0;
        let gastosDeseos =
            (parseFloat(cena.value) || 0) +
            (parseFloat(cine.value) || 0) +
            (parseFloat(gym.value) || 0) +
            (parseFloat(streaming.value) || 0) +
            (parseFloat(ropa.value) || 0) +
            (parseFloat(viajes.value) || 0);

        let restoDeseosValor = totalDeseos - gastosDeseos;
        document.getElementById("restoDeseos").value = restoDeseosValor.toFixed(2);
        numNegativo(document.getElementById("restoDeseos"));
    }

    [cena, cine, gym, streaming, ropa, viajes].forEach((input) => {
        input.addEventListener("input", calcularRestoDeseos);
    });

    function numNegativo(input) {
        if (input.value < 0) {
            input.style.backgroundColor = "red";
        }
    }

});
