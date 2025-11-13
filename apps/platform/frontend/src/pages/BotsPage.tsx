import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FC } from 'react';

const BotsPage: FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  return null;
};

export default BotsPage;
