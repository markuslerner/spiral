// Based on:
// https://threejsfundamentals.org/threejs/lessons/threejs-shadertoy.html
// https://www.shadertoy.com/view/ldBGDc



import * as THREE from 'https://unpkg.com/three@0.116.1/build/three.module.js';

import {GUI} from 'https://threejsfundamentals.org/threejs/../3rdparty/dat.gui.module.js';


const params = {
  speed: 0.0, // 0.1
  exponent: 1.0,
};

function main() {
  const canvas = document.querySelector('#container');
  const renderer = new THREE.WebGLRenderer({canvas});
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

  float spiral(vec2 m) {
    float r = length(m);
    float a = atan(m.y, m.x);
    float rExp = pow(r, exponent);
    float v = sin(100.0 * (rExp - 0.01 * a - iTime));
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

      vec3 col = vec3(v);

      fragColor = vec4(col,1.0);
  }

  void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
  }
  `;

  const uniforms = {
    iTime: { value: 0 },
    exponent: { value: params.exponent },
    iResolution:  { value: new THREE.Vector3() },
  };
  const material = new THREE.ShaderMaterial({
    fragmentShader,
    uniforms,
  });
  scene.add(new THREE.Mesh(plane, material));

  const gui = new GUI();

  gui.add(params, 'speed', 0.0, 1.0);
  gui.add(params, 'exponent', 0.0, 5.0);

  const clock = new THREE.Clock();
  let time = 0;

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

    resizeRendererToDisplaySize(renderer);

    const canvas = renderer.domElement;
    uniforms.iResolution.value.set(canvas.width, canvas.height, 1);
    uniforms.iTime.value = time;
    uniforms.exponent.value = params.exponent;

    renderer.render(scene, camera);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
