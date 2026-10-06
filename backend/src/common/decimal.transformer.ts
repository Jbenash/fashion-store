export const decimal = {
    to: (v?: number | null) => v, //writing to the database
    from: (v?: string | null ) => (v==null ? null : parseFloat(v)) //reading from the database

}