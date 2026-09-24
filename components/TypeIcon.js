import { Bus, Car, Drumstick, Plane, Salad, Zap } from 'lucide-react';

const ICONS = {
  car: Car,
  bus: Bus,
  flight: Plane,
  electricity: Zap,
  veg_meal: Salad,
  nonveg_meal: Drumstick,
};

// Small tinted badge with the activity type's icon. Decorative: the label text is always next to it.
export default function TypeIcon({ type, size = 16 }) {
  const Icon = ICONS[type];
  return (
    <span className="type-chip" data-type={type} aria-hidden="true">
      {Icon && <Icon size={size} strokeWidth={2} />}
    </span>
  );
}
