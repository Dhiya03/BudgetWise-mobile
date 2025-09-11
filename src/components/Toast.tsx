import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Info } from "lucide-react";

interface ToastProps {
  message: string;
  isVisible: boolean;
  type?: "success" | "error" | "info";
  onClose: () => void;
  duration?: number; // auto-dismiss after X ms
}

const Toast = ({
  message,
  isVisible,
  type = "info",
  onClose,
  duration = 3000,
}: ToastProps) => {
  const colors = {
    success: "bg-green-50 border-green-500 text-green-700",
    error: "bg-red-50 border-red-500 text-red-700",
    info: "bg-purple-50 border-purple-500 text-purple-700",
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-purple-500" />,
  };

  // Auto-dismiss logic
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.3 }}
          className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 
                      px-4 py-3 rounded-xl border shadow-lg flex items-center space-x-2
                      w-[90%] max-w-sm ${colors[type]}`}
        >
          {icons[type]}
          <span className="text-sm font-medium">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
