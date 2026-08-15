"use client"

import { AnimatePresence, motion } from "motion/react"

type PageLoaderProps = {
  show: boolean
}

export function PageLoader({ show }: PageLoaderProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="z-20 flex size-full h-svh items-center justify-center bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="animate-pulse text-sm tracking-[0.35em] text-white"
          >
            BLAK
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
