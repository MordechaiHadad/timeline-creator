export type TimeConfig = {
	name: string;
	epoch: number;
	scale: number;
	precision: 'year' | 'date';
};

export type TimelineEvent = {
	id: string;
	date: Date;
	label: string;
	description: string;
	color: string;
};

export type TimelinePeriod = {
	id: string;
	start: Date;
	end: Date;
	label: string;
	color: string;
};

export type TimelineData = {
	title: string;
	events: TimelineEvent[];
	periods: TimelinePeriod[];
};
