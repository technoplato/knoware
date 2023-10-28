import { Canvas, ThreeElements } from '@react-three/fiber';
import { useActor } from '@xstate/react';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import { machine } from './traffic-light.machine';

const useTrafficLightController = () => {
  const [snapshot, send, actor] = useActor(machine);
  return {
    colors: ['green', 'yellow', 'red'].map((color) => {
      return snapshot.value.toLowerCase() === color ? color : 'black';
    }),
    handleLightSelected: (lightPosition: 'top' | 'middle' | 'bottom') => {
      send({ type: 'lightSelected', lightPosition });
    },
  };
};

function TrafficLight(props: ThreeElements['mesh']) {
  const ref = useRef<THREE.Mesh>(null!);
  const { colors, handleLightSelected } = useTrafficLightController();
  const [bottom, middle, top] = colors;
  //   const [hovered, hover] = useState(false);
  //   const [clicked, click] = useState(false);
  // ref.current.rotation.x += 0.01;
  // This is used to rotate the cube every frame
  // useFrame((state, delta) => (ref.current.rotation.y += delta));

  return (
    <mesh
      {...props}
      ref={ref}
      scale={1}
      //   onClick={(event) => click(!clicked)}
      //   onPointerOver={(event) => hover(true)}
      //   onPointerOut={(event) => hover(false)}
    >
      <Box position={[0, 0, 0]} />
      <Sphere
        position={[0, 2, 0.5]}
        color={top}
        handleClick={() => handleLightSelected('top')}
      />
      <Sphere
        position={[0, 0, 0.5]}
        color={middle}
        handleClick={() => handleLightSelected('middle')}
      />
      <Sphere
        position={[0, -2, 0.5]}
        color={bottom}
        handleClick={() => handleLightSelected('bottom')}
      />
    </mesh>
  );
}

type SphereProps = ThreeElements['mesh'] & {
  color?: number; // Optional color prop
  handleClick: () => void;
};

function Sphere({ color = 0x049ef4, handleClick, ...props }: SphereProps) {
  const ref = useRef<THREE.Mesh>(null!);
  const [hovered, hover] = useState(false);
  // const [clicked, click] = useState(false);
  // ref.current.rotation.x += 0.01;
  // This is used to rotate the cube every frame
  // useFrame((state, delta) => (ref.current.rotation.y += delta));

  return (
    <mesh
      {...props}
      ref={ref}
      scale={hovered ? 1.5 : 1}
      // onClick={(event) => click(!clicked)}
      onClick={() => {
        console.log('clkick');
        handleClick();
      }}
      onPointerOver={(event) => hover(true)}
      onPointerOut={(event) => hover(false)}
    >
      <sphereGeometry args={[0.8, 32, 16]} />
      <meshPhysicalMaterial color={color} emissive={0x000000} />
    </mesh>
  );
}

function Box(props: ThreeElements['mesh']) {
  const ref = useRef<THREE.Mesh>(null!);
  const [hovered, hover] = useState(false);
  const [clicked, click] = useState(false);
  // ref.current.rotation.x += 0.01;
  // This is used to rotate the cube every frame
  //   useFrame((state, delta) => (ref.current.rotation.y += delta));

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

export function BcCopyTjScene() {
  return (
    <Canvas>
      <ambientLight />
      <directionalLight position={[5, 5, 3]} intensity={1} />
      <TrafficLight />
    </Canvas>
  );
}
