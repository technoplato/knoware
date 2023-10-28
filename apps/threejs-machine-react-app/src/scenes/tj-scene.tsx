import { Canvas, ThreeElements, useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';

function Sphere(props: ThreeElements['mesh']) {
  const ref = useRef<THREE.Mesh>(null!);
  const [hovered, hover] = useState(false);
  const [clicked, click] = useState(false);
  // ref.current.rotation.x += 0.01;
  // This is used to rotate the cube every frame
  // useFrame((state, delta) => (ref.current.rotation.y += delta));

  return (
    <mesh
      {...props}
      ref={ref}
      scale={hovered ? 1.5 : 1}
      onClick={(event) => click(!clicked)}
      onPointerOver={(event) => hover(true)}
      onPointerOut={(event) => hover(false)}
    >
      <sphereGeometry args={[0.6, 32, 16]} />
      <meshPhysicalMaterial color={0x049ef4} emissive={0x000000} />
    </mesh>
  );
}

function Box(props: ThreeElements['mesh']) {
  const ref = useRef<THREE.Mesh>(null!);
  const [hovered, hover] = useState(false);
  const [clicked, click] = useState(false);
  // ref.current.rotation.x += 0.01;
  // This is used to rotate the cube every frame
  useFrame((state, delta) => (ref.current.rotation.y += delta));

  return (
    <mesh
      {...props}
      ref={ref}
      scale={hovered ? 1.5 : 1}
      onClick={(event) => click(!clicked)}
      onPointerOver={(event) => hover(true)}
      onPointerOut={(event) => hover(false)}
    >
      <boxGeometry args={[2, 8, 2]} />
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </mesh>
  );
}

export function TjScene() {
  return (
    <Canvas>
      <ambientLight />
      <directionalLight position={[5, 5, 3]} intensity={1} />
      <Box position={[0, 0, 0]} />
      <Sphere position={[0, 2, 0]} />
      <Sphere position={[0, 0, 0]} />
      <Sphere position={[0, -2, 0]} />
    </Canvas>
  );
}
