// Based on:
// https://threejsfundamentals.org/threejs/lessons/threejs-shadertoy.html
// https://www.shadertoy.com/view/ldBGDc

import * as THREE from 'https://unpkg.com/three@0.116.1/build/three.module.js';
import {EffectComposer} from 'https://unpkg.com/three@0.116.1/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'https://unpkg.com/three@0.116.1/examples/jsm/postprocessing/RenderPass.js';
import {ShaderPass} from 'https://unpkg.com/three@0.116.1/examples/jsm/postprocessing/ShaderPass.js';
// import {UnrealBloomPass} from 'https://unpkg.com/three@0.116.1/examples/jsm/postprocessing/UnrealBloomPass.js';
import {HorizontalBlurShader} from 'https://unpkg.com/three@0.116.1/examples/jsm/shaders/HorizontalBlurShader.js';
import {VerticalBlurShader} from 'https://unpkg.com/three@0.116.1/examples/jsm/shaders/VerticalBlurShader.js';

import {GUI} from 'https://unpkg.com/dat.gui@0.7.7/build/dat.gui.module.js';

import SmoothFollow from './SmoothFollow.js';



function main() {
  const params = {
    speed: 0.0, // 0.1
    scale: new SmoothFollow(500.0), // 100.0
    exponent: new SmoothFollow(0.8), // 0.25
    color1: '#555',
    color2: '#eebb00',
    color3: '#ffeecc',
    // exposure: 1,
		// bloomStrength: 1.0,
		// bloomThreshold: 1.0,
		// bloomRadius: 0.0,
    blur: new SmoothFollow(0.0),
  };

  const gui = new GUI();

  gui.add(params, 'speed', 0.0, 1.0);
  gui.add(params.scale, 'value', 0.0, 1000.0).name('scale');
  gui.add(params.exponent, 'value', 0.0, 5.0).name('exponent');
  gui.add(params.blur, 'value', 0.0, 5.0).name('blur');
  gui.addColor(params, 'color1').onChange(function() {
    uniforms.color1.value = new THREE.Color(params.color1);
    // var hex = color.getHexString();
    // var css = color.getStyle();
	});
  gui.addColor(params, 'color2').onChange(function() {
    uniforms.color2.value = new THREE.Color(params.color2);
	});
  gui.addColor(params, 'color3').onChange(function() {
    uniforms.color3.value = new THREE.Color(params.color3);
	});
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
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.autoClearColor = false;

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
  uniform float exponent;
  uniform float scale;
  uniform vec3 color1;
  uniform vec3 color2;
  uniform vec3 color3;

  float spiral(vec2 m) {
    float r = length(m);
    float a = atan(m.y, m.x);
    float rExp = pow(r, exponent);
    // float rExp = log(r); // this looks good, too!
    float v = sin(scale * (rExp - (1.0 / scale) * a - iTime));
    return clamp(v, -1.0, 1.0);
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
      // vec3 col = mix(color1, color2, v);
      // vec3 col = v < 0.333 ? mix(color1, color2, smoothstep(0.0, 0.333, v)) : mix(color2, color3, smoothstep(0.333, 1.0, v));
      vec3 col = v < 0.0 ? mix(color1, color2, smoothstep(-1.0, 0.0, v)) : mix(color2, color3, smoothstep(0.0, 1.0, v));
      // vec3 col = v < 0.5 ? mix(color1, color2, smoothstep(0.0, 0.5, v)) : mix(color2, color3, smoothstep(0.5, 1.0, v));

      fragColor = vec4(col, 1.0);
  }

  void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
  }
  `;

  const uniforms = {
    iTime: { value: 0 },
    exponent: { value: params.exponent.valueSmooth },
    scale: { value: params.scale.valueSmooth },
    color1: { type: 'vec3', value: new THREE.Color(params.color1) },
    color2: { type: 'vec3', value: new THREE.Color(params.color2) },
    color3: { type: 'vec3', value: new THREE.Color(params.color3) },
    iResolution:  { value: new THREE.Vector3() },
  };
  const material = new THREE.ShaderMaterial({
    fragmentShader,
    uniforms,
  });
  scene.add(new THREE.Mesh(plane, material));

  const clock = new THREE.Clock();
  let time = 0;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  // resolution, strength, radius, threshold
  // const bloomPass = new UnrealBloomPass(new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85);
  // bloomPass.threshold = params.bloomThreshold;
	// bloomPass.strength = params.bloomStrength;
	// bloomPass.radius = params.bloomRadius;
  // composer.addPass(bloomPass);

  const hblur = new ShaderPass( HorizontalBlurShader );
	composer.addPass( hblur );
	const vblur = new ShaderPass( VerticalBlurShader );
	vblur.renderToScreen = true;
  composer.addPass( vblur );
  hblur.uniforms.h.value = params.blur / window.innerWidth;
  vblur.uniforms.v.value = params.blur / window.innerHeight;

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
    // time *= 0.001;  // convert to seconds
    var delta = clock.getDelta();
    time += delta * params.speed;

    if(resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      composer.setSize(canvas.width, canvas.height);
    }

    const canvas = renderer.domElement;
    uniforms.iResolution.value.set(canvas.width, canvas.height, 1);
    uniforms.iTime.value = time;
    uniforms.exponent.value = params.exponent.loop(delta).valueSmooth;
    uniforms.scale.value = params.scale.loop(delta).valueSmooth;

    hblur.uniforms.h.value = params.blur.loop(delta).valueSmooth / window.innerWidth;
    vblur.uniforms.v.value = params.blur.loop(delta).valueSmooth / window.innerHeight;

    // renderer.render(scene, camera);
    composer.render(delta);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
