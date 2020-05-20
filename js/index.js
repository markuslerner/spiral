// Based on:
// https://threejsfundamentals.org/threejs/lessons/threejs-shadertoy.html
// https://www.shadertoy.com/view/ldBGDc

import * as THREE from 'https://unpkg.com/three@0.116.1/build/three.module.js';
// import {EffectComposer} from 'https://unpkg.com/three@0.116.1/examples/jsm/postprocessing/EffectComposer.js';
// import {RenderPass} from 'https://unpkg.com/three@0.116.1/examples/jsm/postprocessing/RenderPass.js';
// import {ShaderPass} from 'https://unpkg.com/three@0.116.1/examples/jsm/postprocessing/ShaderPass.js';
// import {UnrealBloomPass} from 'https://unpkg.com/three@0.116.1/examples/jsm/postprocessing/UnrealBloomPass.js';
// import {HorizontalBlurShader} from 'https://unpkg.com/three@0.116.1/examples/jsm/shaders/HorizontalBlurShader.js';
// import {VerticalBlurShader} from 'https://unpkg.com/three@0.116.1/examples/jsm/shaders/VerticalBlurShader.js';

import Stats from 'https://unpkg.com/stats.js@0.17.0/src/Stats.js';

import {GUI} from 'https://unpkg.com/dat.gui@0.7.7/build/dat.gui.module.js';

import anime from 'https://unpkg.com/animejs@3.2.0/lib/anime.es.js';

import SmoothFollow from './SmoothFollow.js';



function main() {
  const params = {
    speed: 0.0, // 0.1
    scale: new SmoothFollow(0.0), // 0.0
    animateScale: true, // true
    warp: new SmoothFollow(1.0), // 1.0
    exponent: new SmoothFollow(0.9), // 0.9
    sharpness: new SmoothFollow(0.0), // 0.0
    color1: '#000',
    color2: '#fff',
    // color3: '#ffffaa',
    // exposure: 1,
		// bloomStrength: 1.0,
		// bloomThreshold: 1.0,
		// bloomRadius: 0.0,
    // blur: new SmoothFollow(0.0),
  };

  const stats = new Stats();
  document.body.appendChild( stats.dom );
  stats.dom.style.left = 'auto';
  stats.dom.style.right = '0px';
  stats.dom.style.top = 'auto';
  stats.dom.style.bottom = '0px';

  const gui = new GUI();
  gui.close();

  gui.add(params, 'speed', 0.0, 1.0);
  const scaleController = gui.add(params.scale, 'value', 0.0, 1000.0).name('scale');
  gui.add(params, 'animateScale').name('animate scale').onChange(function() {
    if(animeScale.paused) {
      animeScale.play();
    } else {
      animeScale.pause();
    }
  });
  gui.add(params.warp, 'value', 0.0, 1.0).name('warp');
  gui.add(params.exponent, 'value', 0.0, 1.0).name('exponent');
  gui.add(params.sharpness, 'value', 0.0, 1.0).name('sharpness');
  // gui.add(params.blur, 'value', 0.0, 5.0).name('blur');
  gui.addColor(params, 'color1').onChange(function() {
    uniforms.color1.value = new THREE.Color(params.color1);
    // var hex = color.getHexString();
    // var css = color.getStyle();
	});
  gui.addColor(params, 'color2').onChange(function() {
    uniforms.color2.value = new THREE.Color(params.color2);
	});
  // gui.addColor(params, 'color3').onChange(function() {
  //   uniforms.color3.value = new THREE.Color(params.color3);
	// });
  // gui.add( params, 'exposure', 0.1, 2 ).onChange( function ( value ) {
	// 	renderer.toneMappingExposure = Math.pow( value, 4.0 );
	// } );
	// gui.add( params, 'bloomThreshold', 0.0, 1.0 ).onChange( function ( value ) {
	// 	bloomPass.threshold = Number( value );
	// } );
	// gui.add( params, 'bloomStrength', 0.0, 3.0 ).onChange( function ( value ) {
	// 	bloomPass.strength = Number( value );
	// } );
	// gui.add( params, 'bloomRadius', 0.0, 1.0 ).step( 0.01 ).onChange( function ( value ) {
	// 	bloomPass.radius = Number( value );
	// } );

  const canvas = document.querySelector('#container');
  const renderer = new THREE.WebGLRenderer({canvas});
  // renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.autoClearColor = false;
  renderer.setPixelRatio(window.devicePixelRatio);

  const camera = new THREE.OrthographicCamera(
    -1, // left
     1, // right
     1, // top
    -1, // bottom
    -1, // near,
     1, // far
  );
  const scene = new THREE.Scene();
  const plane = new THREE.PlaneBufferGeometry(2, 2);

  const fragmentShader = `
  #include <common>

  uniform vec3 iResolution;
  uniform float iTime;
  uniform float warp;
  uniform float exponent;
  uniform float sharpness;
  uniform float scale;
  uniform vec3 color1;
  uniform vec3 color2;
  // uniform vec3 color3;

  float easeOutExp(float k) { // good
    return k == 1.0 ? 1.0 : 1.0 - pow( 2.0, - 10.0 * k );
  }

  float ease(float k) {
    return easeOutExp(k);
  }

  float spiral(vec2 m) {
    float r = length(m);
    float a = atan(m.y, -m.x);
    float rExp = pow(r, exponent);
    // float rExp = log(r); // this looks good, too, with scale 20.0
    rExp = mix(rExp, ease(rExp), warp);
    float v = sin(scale * (rExp - (1.0 / scale) * a - iTime));

    // controlling the sharpness of the edge:
    // float range = (1.0 - r) * 1.0;
    // float range = mix(0.0, 1.0, 1.0 - rExp);
    // float range = rExp * 0.5; // mix(0.0, 1.0, 1.0 - rExp);
    float range = mix(rExp, 1.0, 1.0 - rExp) * 0.5; // awesome!
    range = mix(range, 0.0, sharpness);
    v = smoothstep(0.5 - range, 0.5 + range, v);
    return clamp(v, 0.0, 1.0);
  }

  void mainImage( out vec4 fragColor, in vec2 fragCoord )
  {
      // Normalized pixel coordinates (from 0 to 1)
      // vec2 uv = fragCoord / iResolution.xy;

      vec2 uv = vec2(fragCoord.xy / iResolution.y);
      uv.x -= (iResolution.x - iResolution.y) / iResolution.y * 0.5;

      vec2 m = vec2(0.5, 0.5);

      float v = spiral(m-uv);

      // vec3 col = vec3(v);
      vec3 col = mix(color1, color2, v);

      // vec3 col = v < 0.333 ? mix(color1, color2, smoothstep(0.0, 0.333, v)) : mix(color2, color3, smoothstep(0.333, 1.0, v));
      // vec3 col = v < 0.0 ? mix(color1, color2, smoothstep(-1.0, 0.0, v)) : mix(color2, color3, smoothstep(0.0, 1.0, v));
      // vec3 col = v < 0.5 ? mix(color1, color2, smoothstep(0.0, 0.5, v)) : mix(color2, color3, smoothstep(0.5, 1.0, v));

      fragColor = vec4(col, 1.0);
  }

  void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
  }
  `;

  const uniforms = {
    iTime: { value: 0 },
    warp: { value: params.warp.valueSmooth },
    exponent: { value: params.exponent.valueSmooth },
    sharpness: { value: params.sharpness.valueSmooth },
    scale: { value: params.scale.valueSmooth },
    color1: { type: 'vec3', value: new THREE.Color(params.color1) },
    color2: { type: 'vec3', value: new THREE.Color(params.color2) },
    // color3: { type: 'vec3', value: new THREE.Color(params.color3) },
    iResolution:  { value: new THREE.Vector3() },
  };
  const material = new THREE.ShaderMaterial({
    fragmentShader,
    uniforms,
  });
  scene.add(new THREE.Mesh(plane, material));

  const clock = new THREE.Clock();
  let time = 0;

  // const composer = new EffectComposer(renderer);
  // composer.addPass(new RenderPass(scene, camera));

  // resolution, strength, radius, threshold
  // const bloomPass = new UnrealBloomPass(new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85);
  // bloomPass.threshold = params.bloomThreshold;
	// bloomPass.strength = params.bloomStrength;
	// bloomPass.radius = params.bloomRadius;
  // composer.addPass(bloomPass);

  // const hblur = new ShaderPass( HorizontalBlurShader );
	// composer.addPass( hblur );
	// const vblur = new ShaderPass( VerticalBlurShader );
	// vblur.renderToScreen = true;
  // composer.addPass( vblur );
  // hblur.uniforms.h.value = params.blur / window.innerWidth;
  // vblur.uniforms.v.value = params.blur / window.innerHeight;

  const animeScale = anime({
    targets: params.scale,
    value: 250,
    direction: 'alternate',
    duration: 7500,
    loop: true,
    easing: 'easeInOutQuart',
    autoplay: params.animateScale,
    update: () => {
      scaleController.updateDisplay();
    },
  });

  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  function render() { // time
    stats.begin();

    // time *= 0.001;  // convert to seconds
    var delta = clock.getDelta();
    time += delta * params.speed;

    if(resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      // composer.setSize(canvas.width, canvas.height);
    }

    const canvas = renderer.domElement;
    uniforms.iResolution.value.set(canvas.clientWidth * window.devicePixelRatio, canvas.clientHeight * window.devicePixelRatio, 1);
    uniforms.iTime.value = time;
    uniforms.warp.value = params.warp.loop(delta).valueSmooth;
    uniforms.exponent.value = params.exponent.loop(delta).valueSmooth;
    uniforms.sharpness.value = params.sharpness.loop(delta).valueSmooth;
    uniforms.scale.value = params.scale.loop(delta).valueSmooth;

    renderer.render(scene, camera);

    // hblur.uniforms.h.value = params.blur.loop(delta).valueSmooth / window.innerWidth;
    // vblur.uniforms.v.value = params.blur.loop(delta).valueSmooth / window.innerHeight;
    // composer.render(delta);

    stats.end();

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
