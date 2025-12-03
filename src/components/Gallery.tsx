import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

import workshopsImg from "@/assets/programs-workshops.jpg";
import comicsImg from "@/assets/programs-comics.jpg";
import edtechImg from "@/assets/programs-edtech.jpg";
import schoolsImg from "@/assets/programs-schools.jpg";

const galleryImages = [
  {
    src: workshopsImg,
    title: "Hands-On Workshops",
    description: "Students building projects with real tech tools"
  },
  {
    src: comicsImg,
    title: "Creative Learning",
    description: "Making tech fun through storytelling and comics"
  },
  {
    src: edtechImg,
    title: "Digital Skills",
    description: "Young learners exploring coding and AI"
  },
  {
    src: schoolsImg,
    title: "School Programs",
    description: "Bringing tech education directly to classrooms"
  }
];

export const Gallery = () => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => setSelectedIndex(index);
  const closeLightbox = () => setSelectedIndex(null);
  
  const goNext = () => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex + 1) % galleryImages.length);
    }
  };
  
  const goPrev = () => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex - 1 + galleryImages.length) % galleryImages.length);
    }
  };

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-orbitron font-bold text-foreground mb-4">
            Our Impact in Action
          </h2>
          <p className="text-muted-foreground font-space max-w-2xl mx-auto">
            See how we're transforming tech education across Africa
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {galleryImages.map((image, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={{ scale: 1.03 }}
              onClick={() => openLightbox(index)}
              className="relative cursor-pointer group overflow-hidden rounded-xl aspect-square"
            >
              <img
                src={image.src}
                alt={image.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                <div>
                  <h3 className="text-foreground font-space font-semibold text-sm md:text-base">
                    {image.title}
                  </h3>
                  <p className="text-muted-foreground text-xs hidden md:block">
                    {image.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closeLightbox}
          >
            <button
              onClick={closeLightbox}
              className="absolute top-6 right-6 text-foreground hover:text-primary transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-4 md:left-8 text-foreground hover:text-primary transition-colors"
            >
              <ChevronLeft className="w-10 h-10" />
            </button>
            
            <motion.div
              key={selectedIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="max-w-4xl max-h-[80vh] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={galleryImages[selectedIndex].src}
                alt={galleryImages[selectedIndex].title}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
              <div className="text-center mt-4">
                <h3 className="text-foreground font-orbitron font-bold text-xl">
                  {galleryImages[selectedIndex].title}
                </h3>
                <p className="text-muted-foreground font-space">
                  {galleryImages[selectedIndex].description}
                </p>
              </div>
            </motion.div>
            
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-4 md:right-8 text-foreground hover:text-primary transition-colors"
            >
              <ChevronRight className="w-10 h-10" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
