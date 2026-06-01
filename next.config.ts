const nextConfig = {
  output: 'standalone',
  // Deshabilitar prerenderizado estático para rutas dinámicas
  staticPageGenerationTimeout: 120,
  // Configurar para que todas las rutas sean dinámicas
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig