
UPDATE exercises SET thumbnail_url = CASE muscle_group
  WHEN 'chest' THEN 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80'
  WHEN 'back' THEN 'https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=400&q=80'
  WHEN 'legs' THEN 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=400&q=80'
  WHEN 'glutes' THEN 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&q=80'
  WHEN 'calves' THEN 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=400&q=80'
  WHEN 'shoulders' THEN 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?w=400&q=80'
  WHEN 'traps' THEN 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?w=400&q=80'
  WHEN 'biceps' THEN 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80'
  WHEN 'triceps' THEN 'https://images.unsplash.com/photo-1530822847156-5df684ec5ee1?w=400&q=80'
  WHEN 'forearms' THEN 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80'
  WHEN 'core' THEN 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80'
  WHEN 'lower_back' THEN 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80'
  WHEN 'full_body' THEN 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=400&q=80'
  WHEN 'mobility' THEN 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80'
  WHEN 'cardio' THEN 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=400&q=80'
  ELSE 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80'
END;
