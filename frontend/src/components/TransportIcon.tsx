import React from 'react';
import { SvgProps } from 'react-native-svg';

import TaxiIcon from '../../assets/icons/taxi.svg';
import GbakaIcon from '../../assets/icons/gbaka.svg';
import SotraIcon from '../../assets/icons/sotra.svg';
import WalkingIcon from '../../assets/icons/walking.svg';

import { TRANSPORT_COLORS } from '../constants/transport';
import { TransportType } from '../types';

interface Props extends SvgProps {
  type: TransportType;
  size?: number;
  color?: string; // Optional override; otherwise uses transport-specific color
}

const ICON_MAP: Record<TransportType, React.FC<SvgProps>> = {
  communal_taxi: TaxiIcon,
  gbaka: GbakaIcon,
  sotra_bus: SotraIcon,
  walking: WalkingIcon,
};

export default function TransportIcon({
  type,
  size = 20,
  color,
  ...svgProps
}: Props) {
  const Icon = ICON_MAP[type];
  if (!Icon) return null;

  const fillColor = color || TRANSPORT_COLORS[type];

  return (
    <Icon
      width={size}
      height={size}
      fill={fillColor}
      {...svgProps}
    />
  );
}
