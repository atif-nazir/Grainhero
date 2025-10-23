"use client"

import React, { useRef, useState, useEffect } from 'react'
import { motion, useAnimation, useInView } from 'framer-motion'
import { useSpring, animated } from '@react-spring/web'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sphere, Box } from '@react-three/drei'
import { 
  Sparkles, 
  Zap, 
  Shield, 
  TrendingUp, 
  Globe, 
  Database,
  Cpu,
  BarChart3,
  Activity
} from 'lucide-react'

// 3D Floating Elements
function FloatingCube({ position, color }: { position: [number, number, number], color: string }) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.3
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.3
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.8) * 0.5
    }
  })

  return (
    <Box ref={meshRef} position={position} args={[1, 1, 1]}>
      <meshStandardMaterial color={color} />
    </Box>
  )
}

function FloatingSphere({ position, color }: { position: [number, number, number], color: string }) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.4) * 0.2
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.2
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.3
    }
  })

  return (
    <Sphere ref={meshRef} position={position} args={[0.5, 32, 32]}>
      <meshStandardMaterial color={color} />
    </Sphere>
  )
}

// Hero Section with 3D Background
export function AnimatedHero({ 
  title, 
  subtitle, 
  ctaText, 
  onCtaClick 
}: { 
  title: string
  subtitle: string
  ctaText: string
  onCtaClick: () => void
}) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1
      })
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div className="relative h-screen overflow-hidden bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* 3D Background */}
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <pointLight position={[-5, 5, 5]} intensity={0.3} />
          
          <FloatingCube position={[-2, 1, 0]} color="#3b82f6" />
          <FloatingCube position={[2, -1, 0]} color="#10b981" />
          <FloatingSphere position={[0, 2, -1]} color="#f59e0b" />
          <FloatingSphere position={[-1, -1, 1]} color="#ef4444" />
          <FloatingCube position={[1, 0, -2]} color="#8b5cf6" />
          
          <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center h-full">
        <div className="text-center text-white max-w-4xl mx-auto px-4">
          <motion.h1
            className="text-6xl md:text-8xl font-bold mb-6"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            {title}
          </motion.h1>
          
          <motion.p
            className="text-xl md:text-2xl mb-8 text-blue-100"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            {subtitle}
          </motion.p>
          
          <motion.button
            className="bg-white text-blue-900 px-8 py-4 rounded-full text-lg font-semibold hover:bg-blue-50 transition-colors"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onCtaClick}
          >
            {ctaText}
          </motion.button>
        </div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-60"
            animate={{
              x: [0, Math.random() * 200 - 100],
              y: [0, -Math.random() * 200],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Animated Feature Cards
export function AnimatedFeatureCards({ 
  features 
}: { 
  features: Array<{
    icon: React.ComponentType<any>
    title: string
    description: string
    color: string
  }>
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 py-16">
      {features.map((feature, index) => (
        <motion.div
          key={index}
          className="bg-white rounded-2xl p-8 shadow-xl"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: index * 0.1 }}
          whileHover={{ 
            y: -10,
            transition: { duration: 0.3 }
          }}
        >
          <motion.div
            className={`inline-flex p-4 rounded-full ${feature.color} mb-6`}
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
          >
            <feature.icon className="w-8 h-8 text-white" />
          </motion.div>
          
          <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
          <p className="text-gray-600 text-lg">{feature.description}</p>
        </motion.div>
      ))}
    </div>
  )
}

// Animated Stats Section
export function AnimatedStatsSection({ 
  stats 
}: { 
  stats: Array<{
    value: number
    label: string
    suffix?: string
  }>
}) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              className="text-center text-white"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
            >
              <motion.div
                className="text-5xl font-bold mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: index * 0.2 + 0.5 }}
              >
                <animated.span>
                  {stat.value.toLocaleString()}
                  {stat.suffix}
                </animated.span>
              </motion.div>
              <p className="text-xl text-blue-100">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Animated Testimonial Cards
export function AnimatedTestimonials({ 
  testimonials 
}: { 
  testimonials: Array<{
    name: string
    role: string
    content: string
    avatar?: string
  }>
}) {
  return (
    <div className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.h2
          className="text-4xl font-bold text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          What Our Users Say
        </motion.h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              className="bg-white rounded-2xl p-8 shadow-lg"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  {testimonial.name.charAt(0)}
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold">{testimonial.name}</h4>
                  <p className="text-gray-600 text-sm">{testimonial.role}</p>
                </div>
              </div>
              <p className="text-gray-700 italic">"{testimonial.content}"</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Animated CTA Section
export function AnimatedCTA({ 
  title, 
  description, 
  buttonText, 
  onButtonClick 
}: { 
  title: string
  description: string
  buttonText: string
  onButtonClick: () => void
}) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-20">
      <div className="container mx-auto px-4 text-center">
        <motion.h2
          className="text-4xl md:text-6xl font-bold text-white mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {title}
        </motion.h2>
        
        <motion.p
          className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {description}
        </motion.p>
        
        <motion.button
          className="bg-white text-blue-600 px-8 py-4 rounded-full text-lg font-semibold hover:bg-blue-50 transition-colors"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onButtonClick}
        >
          {buttonText}
        </motion.button>
      </div>
    </div>
  )
}
