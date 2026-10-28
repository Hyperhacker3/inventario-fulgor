import { useInventory } from '../context/InventoryContext';
import { HelpDialog } from './help/HelpDialog';

export function HelpModal() {
  const { isHelpModalOpen, setIsHelpModalOpen } = useInventory();
  return <HelpDialog open={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />;
}
