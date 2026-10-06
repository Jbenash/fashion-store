import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional,
  IsPositive, IsString, IsUrl, MaxLength, Min, ValidateNested,
} from 'class-validator';

export class VariantDto {
  @IsOptional() @IsInt() id?: number;
  @IsNotEmpty() size: string;
  @IsNotEmpty() colour: string;
  @IsInt() @Min(0) stock: number;
}

export class CreateProductDto {
  @IsNotEmpty() @MaxLength(120) name: string;
  @IsNotEmpty() description: string;
  @IsNumber() @IsPositive() price: number;
  @IsOptional() @IsInt() @Min(2) bulkMinQty?: number;
  @IsOptional() @IsNumber() @IsPositive() bulkPrice?: number;
  @IsOptional() @IsUrl() imageUrl?: string;
  @IsInt() categoryId: number;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => VariantDto) variants: VariantDto[];
}

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ProductQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Number) @IsInt() categoryId?: number;
  @IsOptional() @IsString() size?: string;
  @IsOptional() @Type(() => Number) @IsNumber() minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxPrice?: number;
  @IsOptional() @IsIn(['newest', 'price_asc', 'price_desc']) sort?: string;
}