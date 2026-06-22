export type Context = {
	uid: string;
	isExpanded: boolean;
	currentIndex: number;
	onExpand: (isExpanded: boolean) => void;
	onCollapse: (isExpanded: boolean) => void;
};
