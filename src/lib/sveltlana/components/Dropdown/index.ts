import DropdownComponent from './Dropdown.svelte';
import Content from './DropdownContent.svelte';
import Item from './DropdownItem.svelte';
import Seperator from './DropdownSeperator.svelte';
import Trigger from './DropdownTrigger.svelte';

type DropdownType = typeof DropdownComponent & {
	Content: typeof Content;
	Item: typeof Item;
	Seperator: typeof Seperator;
	Trigger: typeof Trigger;
};

const Dropdown = DropdownComponent as DropdownType;

Dropdown.Content = Content;
Dropdown.Item = Item;
Dropdown.Seperator = Seperator;
Dropdown.Trigger = Trigger;

export default Dropdown;
