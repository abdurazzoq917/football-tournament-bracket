"use strict";


const vertexShader = `#version 300 es
in vec2 position;

void main() {
    gl_Position = vec4(position, 0.0, 1.0);
}
`;


const fragmentShader = `#version 300 es
precision highp float;

uniform vec2 iResolution;
uniform float iTime;

uniform float uTimeSpeed;
uniform float uColorBalance;
uniform float uWarpStrength;
uniform float uWarpFrequency;
uniform float uWarpSpeed;
uniform float uWarpAmplitude;
uniform float uBlendAngle;
uniform float uBlendSoftness;
uniform float uRotationAmount;
uniform float uNoiseScale;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainAnimated;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;
uniform vec2 uCenterOffset;
uniform float uZoom;

uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

out vec4 fragColor;

#define S(a, b, t) smoothstep(a, b, t)


mat2 rotationMatrix(float angle) {
    float sineValue = sin(angle);
    float cosineValue = cos(angle);

    return mat2(
        cosineValue,
        -sineValue,
        sineValue,
        cosineValue
    );
}


vec2 hashValue(vec2 point) {
    point = vec2(
        dot(point, vec2(2127.1, 81.17)),
        dot(point, vec2(1269.5, 283.37))
    );

    return fract(
        sin(point) * 43758.5453
    );
}


float noiseValue(vec2 point) {
    vec2 integerPart = floor(point);
    vec2 fractionPart = fract(point);

    vec2 smoothPart =
        fractionPart *
        fractionPart *
        (3.0 - 2.0 * fractionPart);

    float result = mix(
        mix(
            dot(
                -1.0 + 2.0 *
                hashValue(integerPart + vec2(0.0, 0.0)),
                fractionPart - vec2(0.0, 0.0)
            ),
            dot(
                -1.0 + 2.0 *
                hashValue(integerPart + vec2(1.0, 0.0)),
                fractionPart - vec2(1.0, 0.0)
            ),
            smoothPart.x
        ),
        mix(
            dot(
                -1.0 + 2.0 *
                hashValue(integerPart + vec2(0.0, 1.0)),
                fractionPart - vec2(0.0, 1.0)
            ),
            dot(
                -1.0 + 2.0 *
                hashValue(integerPart + vec2(1.0, 1.0)),
                fractionPart - vec2(1.0, 1.0)
            ),
            smoothPart.x
        ),
        smoothPart.y
    );

    return 0.5 + 0.5 * result;
}


void mainImage(
    out vec4 outputColor,
    vec2 coordinate
) {
    float timeValue =
        iTime * uTimeSpeed;

    vec2 uv =
        coordinate / iResolution.xy;

    float ratio =
        iResolution.x / iResolution.y;

    vec2 transformedUv =
        uv - 0.5 + uCenterOffset;

    transformedUv /=
        max(uZoom, 0.001);

    float degree =
        noiseValue(
            vec2(
                timeValue * 0.1,
                transformedUv.x *
                transformedUv.y
            ) * uNoiseScale
        );

    transformedUv.y *=
        1.0 / ratio;

    transformedUv *=
        rotationMatrix(
            radians(
                (degree - 0.5) *
                uRotationAmount +
                180.0
            )
        );

    transformedUv.y *= ratio;

    float frequency =
        uWarpFrequency;

    float warpStrength =
        max(uWarpStrength, 0.001);

    float amplitude =
        uWarpAmplitude / warpStrength;

    float warpTime =
        timeValue * uWarpSpeed;

    transformedUv.x +=
        sin(
            transformedUv.y *
            frequency +
            warpTime
        ) / amplitude;

    transformedUv.y +=
        sin(
            transformedUv.x *
            (frequency * 1.5) +
            warpTime
        ) / (amplitude * 0.5);

    float softness =
        max(uBlendSoftness, 0.0);

    mat2 blendRotation =
        rotationMatrix(
            radians(uBlendAngle)
        );

    float blendX =
        (transformedUv * blendRotation).x;

    float edge0 =
        -0.3 -
        uColorBalance -
        softness;

    float edge1 =
        0.2 -
        uColorBalance +
        softness;

    float vertical0 =
        0.5 -
        uColorBalance +
        softness;

    float vertical1 =
        -0.3 -
        uColorBalance -
        softness;

    vec3 layer1 =
        mix(
            uColor3,
            uColor2,
            S(edge0, edge1, blendX)
        );

    vec3 layer2 =
        mix(
            uColor2,
            uColor1,
            S(edge0, edge1, blendX)
        );

    vec3 finalColor =
        mix(
            layer1,
            layer2,
            S(
                vertical0,
                vertical1,
                transformedUv.y
            )
        );

    vec2 grainUv =
        uv * max(uGrainScale, 0.001);

    if (uGrainAnimated > 0.5) {
        grainUv += vec2(iTime * 0.05);
    }

    float grain =
        fract(
            sin(
                dot(
                    grainUv,
                    vec2(12.9898, 78.233)
                )
            ) * 43758.5453
        );

    finalColor +=
        (grain - 0.5) *
        uGrainAmount;

    finalColor =
        (finalColor - 0.5) *
        uContrast +
        0.5;

    float luminance =
        dot(
            finalColor,
            vec3(
                0.2126,
                0.7152,
                0.0722
            )
        );

    finalColor =
        mix(
            vec3(luminance),
            finalColor,
            uSaturation
        );

    finalColor =
        pow(
            max(finalColor, 0.0),
            vec3(
                1.0 /
                max(uGamma, 0.001)
            )
        );

    finalColor =
        clamp(
            finalColor,
            0.0,
            1.0
        );

    outputColor =
        vec4(finalColor, 1.0);
}


void main() {
    vec4 outputColor = vec4(0.0);

    mainImage(
        outputColor,
        gl_FragCoord.xy
    );

    fragColor = outputColor;
}
`;


function hexToRgb(hexColor) {
    const normalized =
        hexColor
            .replace("#", "")
            .trim();

    if (normalized.length !== 6) {
        return [1, 1, 1];
    }

    return [
        parseInt(
            normalized.slice(0, 2),
            16
        ) / 255,

        parseInt(
            normalized.slice(2, 4),
            16
        ) / 255,

        parseInt(
            normalized.slice(4, 6),
            16
        ) / 255,
    ];
}


function createShader(gl, type, source) {
    const shader =
        gl.createShader(type);

    if (!shader) {
        throw new Error(
            "Shader yaratib bo‘lmadi."
        );
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const compiled =
        gl.getShaderParameter(
            shader,
            gl.COMPILE_STATUS
        );

    if (!compiled) {
        const errorMessage =
            gl.getShaderInfoLog(shader);

        gl.deleteShader(shader);

        throw new Error(
            `Shader xatosi: ${errorMessage}`
        );
    }

    return shader;
}


function createProgram(
    gl,
    vertexSource,
    fragmentSource
) {
    const vertex =
        createShader(
            gl,
            gl.VERTEX_SHADER,
            vertexSource
        );

    const fragment =
        createShader(
            gl,
            gl.FRAGMENT_SHADER,
            fragmentSource
        );

    const program =
        gl.createProgram();

    if (!program) {
        throw new Error(
            "WebGL dastur yaratib bo‘lmadi."
        );
    }

    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);

    gl.deleteShader(vertex);
    gl.deleteShader(fragment);

    const linked =
        gl.getProgramParameter(
            program,
            gl.LINK_STATUS
        );

    if (!linked) {
        const errorMessage =
            gl.getProgramInfoLog(program);

        gl.deleteProgram(program);

        throw new Error(
            `WebGL dastur xatosi: ${errorMessage}`
        );
    }

    return program;
}


function initializeGrainient() {
    const container =
        document.querySelector(
            "#grainientBackground"
        );

    if (!container) {
        return;
    }

    const canvas =
        document.createElement("canvas");

    canvas.className =
        "grainient-canvas";

    container.appendChild(canvas);

    const gl =
        canvas.getContext(
            "webgl2",
            {
                alpha: false,
                antialias: false,
                powerPreference:
                    "high-performance",
            }
        );

    if (!gl) {
        container.classList.add(
            "grainient-fallback"
        );

        console.warn(
            "WebGL 2 ishlamadi. Oddiy fon ishlatiladi."
        );

        return;
    }

    let program;

    try {
        program = createProgram(
            gl,
            vertexShader,
            fragmentShader
        );
    } catch (error) {
        console.error(error);

        container.classList.add(
            "grainient-fallback"
        );

        canvas.remove();
        return;
    }

    gl.useProgram(program);

    const positionLocation =
        gl.getAttribLocation(
            program,
            "position"
        );

    const buffer =
        gl.createBuffer();

    gl.bindBuffer(
        gl.ARRAY_BUFFER,
        buffer
    );

    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
            -1, -1,
             3, -1,
            -1,  3,
        ]),
        gl.STATIC_DRAW
    );

    gl.enableVertexAttribArray(
        positionLocation
    );

    gl.vertexAttribPointer(
        positionLocation,
        2,
        gl.FLOAT,
        false,
        0,
        0
    );

    const uniforms = {
        iResolution:
            gl.getUniformLocation(
                program,
                "iResolution"
            ),

        iTime:
            gl.getUniformLocation(
                program,
                "iTime"
            ),

        uTimeSpeed:
            gl.getUniformLocation(
                program,
                "uTimeSpeed"
            ),

        uColorBalance:
            gl.getUniformLocation(
                program,
                "uColorBalance"
            ),

        uWarpStrength:
            gl.getUniformLocation(
                program,
                "uWarpStrength"
            ),

        uWarpFrequency:
            gl.getUniformLocation(
                program,
                "uWarpFrequency"
            ),

        uWarpSpeed:
            gl.getUniformLocation(
                program,
                "uWarpSpeed"
            ),

        uWarpAmplitude:
            gl.getUniformLocation(
                program,
                "uWarpAmplitude"
            ),

        uBlendAngle:
            gl.getUniformLocation(
                program,
                "uBlendAngle"
            ),

        uBlendSoftness:
            gl.getUniformLocation(
                program,
                "uBlendSoftness"
            ),

        uRotationAmount:
            gl.getUniformLocation(
                program,
                "uRotationAmount"
            ),

        uNoiseScale:
            gl.getUniformLocation(
                program,
                "uNoiseScale"
            ),

        uGrainAmount:
            gl.getUniformLocation(
                program,
                "uGrainAmount"
            ),

        uGrainScale:
            gl.getUniformLocation(
                program,
                "uGrainScale"
            ),

        uGrainAnimated:
            gl.getUniformLocation(
                program,
                "uGrainAnimated"
            ),

        uContrast:
            gl.getUniformLocation(
                program,
                "uContrast"
            ),

        uGamma:
            gl.getUniformLocation(
                program,
                "uGamma"
            ),

        uSaturation:
            gl.getUniformLocation(
                program,
                "uSaturation"
            ),

        uCenterOffset:
            gl.getUniformLocation(
                program,
                "uCenterOffset"
            ),

        uZoom:
            gl.getUniformLocation(
                program,
                "uZoom"
            ),

        uColor1:
            gl.getUniformLocation(
                program,
                "uColor1"
            ),

        uColor2:
            gl.getUniformLocation(
                program,
                "uColor2"
            ),

        uColor3:
            gl.getUniformLocation(
                program,
                "uColor3"
            ),
    };

    const color1 =
        hexToRgb("#8995a4");

    const color2 =
        hexToRgb("#344150");

    const color3 =
        hexToRgb("#7197bf");

    gl.uniform1f(
        uniforms.uTimeSpeed,
        0.25
    );

    gl.uniform1f(
        uniforms.uColorBalance,
        0
    );

    gl.uniform1f(
        uniforms.uWarpStrength,
        1
    );

    gl.uniform1f(
        uniforms.uWarpFrequency,
        5
    );

    gl.uniform1f(
        uniforms.uWarpSpeed,
        2
    );

    gl.uniform1f(
        uniforms.uWarpAmplitude,
        50
    );

    gl.uniform1f(
        uniforms.uBlendAngle,
        0
    );

    gl.uniform1f(
        uniforms.uBlendSoftness,
        0.05
    );

    gl.uniform1f(
        uniforms.uRotationAmount,
        500
    );

    gl.uniform1f(
        uniforms.uNoiseScale,
        2
    );

    gl.uniform1f(
        uniforms.uGrainAmount,
        0.1
    );

    gl.uniform1f(
        uniforms.uGrainScale,
        2
    );

    gl.uniform1f(
        uniforms.uGrainAnimated,
        0
    );

    gl.uniform1f(
        uniforms.uContrast,
        1.5
    );

    gl.uniform1f(
        uniforms.uGamma,
        1
    );

    gl.uniform1f(
        uniforms.uSaturation,
        1
    );

    gl.uniform2f(
        uniforms.uCenterOffset,
        0,
        0
    );

    gl.uniform1f(
        uniforms.uZoom,
        0.9
    );

    gl.uniform3fv(
        uniforms.uColor1,
        color1
    );

    gl.uniform3fv(
        uniforms.uColor2,
        color2
    );

    gl.uniform3fv(
        uniforms.uColor3,
        color3
    );

    function resizeCanvas() {
        const width =
            Math.max(
                1,
                Math.floor(
                    container.clientWidth
                )
            );

        const height =
            Math.max(
                1,
                Math.floor(
                    container.clientHeight
                )
            );

        const pixelRatio =
            Math.min(
                window.devicePixelRatio || 1,
                2
            );

        canvas.width =
            Math.floor(
                width * pixelRatio
            );

        canvas.height =
            Math.floor(
                height * pixelRatio
            );

        canvas.style.width =
            `${width}px`;

        canvas.style.height =
            `${height}px`;

        gl.viewport(
            0,
            0,
            canvas.width,
            canvas.height
        );

        gl.uniform2f(
            uniforms.iResolution,
            canvas.width,
            canvas.height
        );
    }

    resizeCanvas();

    const resizeObserver =
        new ResizeObserver(
            resizeCanvas
        );

    resizeObserver.observe(container);

    const startTime =
        performance.now();

    let animationFrameId = 0;
    let pageVisible =
        !document.hidden;

    function render(currentTime) {
        if (!pageVisible) {
            animationFrameId = 0;
            return;
        }

        const elapsed =
            (currentTime - startTime) /
            1000;

        gl.uniform1f(
            uniforms.iTime,
            elapsed
        );

        gl.drawArrays(
            gl.TRIANGLES,
            0,
            3
        );

        animationFrameId =
            requestAnimationFrame(render);
    }

    function startAnimation() {
        if (animationFrameId !== 0) {
            return;
        }

        animationFrameId =
            requestAnimationFrame(render);
    }

    function stopAnimation() {
        if (animationFrameId === 0) {
            return;
        }

        cancelAnimationFrame(
            animationFrameId
        );

        animationFrameId = 0;
    }

    document.addEventListener(
        "visibilitychange",
        () => {
            pageVisible =
                !document.hidden;

            if (pageVisible) {
                startAnimation();
            } else {
                stopAnimation();
            }
        }
    );

    startAnimation();
}


document.addEventListener(
    "DOMContentLoaded",
    initializeGrainient
);