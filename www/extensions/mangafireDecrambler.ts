onmessage = async function (event) {
    const s = event.data[0];
    const image = await createImageBitmap(await (await fetch(event.data[1])).blob());
    const canvas = new OffscreenCanvas(image.width, image.height);

    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    var x = Math.min(200, Math.ceil(image.height / 5));
    var C = Math.ceil(image.height / x);
    var W = C - 1;
    var a = Math.min(200, Math.ceil(image.width / 5));
    var v = Math.ceil(image.width / a);
    var l = v - 1;

    for (var q = 0; q <= W; q++) {
        for (var R = 0; R <= l; R++) {
            let h = R, k = q;
            R < l && (h = (l - R + s) % l),
                q < W && (k = (W - q + s) % (W)),
                ctx.drawImage(
                    image, h * a, k * x, Math.min(a, image.width - R * a),
                    Math.min(x, image.height - q * x),
                    R * a, q * x,
                    Math.min(a, image.width - R * a),
                    Math.min(x, image.height - q * x)
                );
        }
    }

    this.postMessage(await canvas.convertToBlob());
};