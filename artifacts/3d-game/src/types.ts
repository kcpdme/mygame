import * as THREE from 'three'

export interface AIState {
  position: THREE.Vector3
  velocity: THREE.Vector3
  push:     THREE.Vector3
}
